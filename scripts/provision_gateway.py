"""Provision Onward's agent surface: writer credentials and the bookings table, the tools Lambda,
AgentCore Gateway (MCP, IAM inbound), the Cedar policy engine, and the runtime's permissions.

Re-runnable. Identifiers land in infra/deployed.json; no secret value is ever printed or stored here.
"""
import json
import secrets
import shutil
import string
import subprocess
import time
import zipfile

from provision import ACCOUNT, CONFIG, REGION, ROOT, SESSION, STATE, TAGS, save, sql

PLATFORM = ('--python-platform', 'aarch64-manylinux2014', '--python-version', '3.13', '--only-binary=:all:')
FUNCTION = 'onward-london-2026-tools'
GATEWAY = 'onward-london-2026'
TARGET = 'OnwardTools'
ENGINE = 'onward_london_2026'
TOOLS = ['resolve_entities', 'search_hotels', 'price_bundles', 'validate_journeys', 'select_itinerary']
TAG_LIST = [{'Key': k, 'Value': v} for k, v in TAGS.items()]

iam = SESSION.client('iam', config=CONFIG)
lam = SESSION.client('lambda', config=CONFIG)
sm = SESSION.client('secretsmanager', config=CONFIG)
control = SESSION.client('bedrock-agentcore-control', config=CONFIG)


def wait(describe, ready, failed=('FAILED', 'DELETE_FAILED'), label='', timeout=600):
    started = time.time()
    while True:
        status = describe()
        if status in ready:
            return status
        if status in failed or time.time() - started > timeout:
            raise RuntimeError(f'{label} ended in status {status}.')
        time.sleep(5)


def writer_credentials(cfg):
    role, name = 'onward_london_2026_writer', 'onward/london-2026/database-writer'
    sql('CREATE TABLE IF NOT EXISTS bookings (id text PRIMARY KEY, session_id text NOT NULL, traveller_id text NOT NULL, '
        'offer_id text NOT NULL REFERENCES offers(id), hotel_id text NOT NULL REFERENCES hotels(id), total_pence integer NOT NULL, '
        'policy_decision text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())', 'onward')
    sql('CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_session ON bookings(session_id)', 'onward')
    if 'writerSecretArn' not in cfg:
        try:
            cfg['writerSecretArn'] = sm.describe_secret(SecretId=name)['ARN']
        except sm.exceptions.ResourceNotFoundException:
            if sql(f"SELECT rolname FROM pg_roles WHERE rolname='{role}'", 'onward'):
                raise RuntimeError('Writer role exists without its secret; resolve this explicitly.')
            password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(40))
            # The random password never enters logs, files or subprocess arguments.
            sql(f"CREATE ROLE {role} LOGIN PASSWORD '{password}'", 'onward')
            cfg['writerSecretArn'] = sm.create_secret(Name=name, Tags=TAG_LIST,
                SecretString=json.dumps({'username': role, 'password': password, 'engine': 'postgres',
                    'host': 'meridian-demo.cluster-c2twt17nzzpq.us-east-1.rds.amazonaws.com', 'port': 5432, 'dbname': 'onward'}))['ARN']
            del password
    for grant in (f'GRANT CONNECT ON DATABASE onward TO {role}', f'GRANT USAGE ON SCHEMA public TO {role}',
                  f'GRANT SELECT ON ALL TABLES IN SCHEMA public TO {role}', f'GRANT INSERT ON bookings TO {role}',
                  f'GRANT UPDATE ON offers, hotels TO {role}'):
        sql(grant, 'onward')
    save(cfg)
    print('Aurora: bookings table and writer secret ready.', flush=True)


def ensure_role(name, service, statements):
    trust = {'Version': '2012-10-17', 'Statement': [{'Effect': 'Allow', 'Principal': {'Service': service}, 'Action': 'sts:AssumeRole',
             'Condition': {'StringEquals': {'aws:SourceAccount': ACCOUNT}}}]}
    created = False
    try:
        arn = iam.get_role(RoleName=name)['Role']['Arn']
    except iam.exceptions.NoSuchEntityException:
        arn = iam.create_role(RoleName=name, AssumeRolePolicyDocument=json.dumps(trust), Tags=TAG_LIST,
                              Description='Onward London 2026 demo')['Role']['Arn']
        created = True
    iam.put_role_policy(RoleName=name, PolicyName='OnwardScopedAccess',
                        PolicyDocument=json.dumps({'Version': '2012-10-17', 'Statement': statements}))
    if created:
        time.sleep(10)
    return arn


def lambda_status():
    configuration = lam.get_function_configuration(FunctionName=FUNCTION)
    if configuration.get('State') == 'Failed' or configuration.get('LastUpdateStatus') == 'Failed':
        return 'FAILED'
    if configuration.get('State') == 'Active' and configuration.get('LastUpdateStatus') in (None, 'Successful'):
        return 'READY'
    return 'PENDING'


def tools_function(cfg):
    role_arn = ensure_role('OnwardLondon2026Tools', 'lambda.amazonaws.com', [
        {'Effect': 'Allow', 'Action': ['rds-data:ExecuteStatement'], 'Resource': cfg['clusterArn']},
        {'Effect': 'Allow', 'Action': ['secretsmanager:GetSecretValue'], 'Resource': [cfg['secretArn'], cfg['writerSecretArn']]},
        {'Effect': 'Allow', 'Action': ['bedrock:InvokeModel'], 'Resource': f'arn:aws:bedrock:{REGION}::foundation-model/{cfg["embeddingModelId"]}'},
        {'Effect': 'Allow', 'Action': ['neptune-graph:ReadDataViaQuery'], 'Resource': cfg['graphArn']},
        {'Effect': 'Allow', 'Action': ['s3:GetObject', 's3:GetObjectVersion'], 'Resource': f'arn:aws:s3:::{cfg["bucket"]}/*'},
        {'Effect': 'Allow', 'Action': ['bedrock-agentcore:RetrieveMemoryRecords', 'bedrock-agentcore:ListMemoryRecords', 'bedrock-agentcore:ListEvents'],
         'Resource': cfg['memoryArn']},
        {'Effect': 'Allow', 'Action': ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
         'Resource': f'arn:aws:logs:{REGION}:{ACCOUNT}:log-group:/aws/lambda/{FUNCTION}*'},
    ])
    package = ROOT / '.build/tools-package'
    shutil.rmtree(package, ignore_errors=True)
    package.mkdir(parents=True)
    subprocess.run(['uv', 'pip', 'install', '--quiet', '--target', str(package), *PLATFORM,
                    '-r', str(ROOT / 'backend/tools-requirements.lock')], check=True)
    for filename in ('tools.py', 'services.py', 'planner.py'):
        shutil.copy2(ROOT / 'backend' / filename, package / filename)
    shutil.copy2(STATE, package / 'deployed.json')
    artifact = ROOT / '.build/onward-tools.zip'
    with zipfile.ZipFile(artifact, 'w', zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(package.rglob('*')):
            if source.is_file() and '__pycache__' not in source.parts:
                archive.write(source, source.relative_to(package))
    code = artifact.read_bytes()
    configuration = {'Runtime': 'python3.13', 'Role': role_arn, 'Handler': 'tools.handler', 'Timeout': 60, 'MemorySize': 512,
                     'Environment': {'Variables': {'ONWARD_CONFIG': 'deployed.json'}},
                     'Description': 'Onward semantic-layer tools served through AgentCore Gateway'}
    try:
        lam.get_function(FunctionName=FUNCTION)
        lam.update_function_code(FunctionName=FUNCTION, ZipFile=code, Architectures=['arm64'])
        wait(lambda_status, ('READY',), ('FAILED',), 'Lambda code update')
        arn = lam.update_function_configuration(FunctionName=FUNCTION, **configuration)['FunctionArn']
    except lam.exceptions.ResourceNotFoundException:
        arn = lam.create_function(FunctionName=FUNCTION, Code={'ZipFile': code}, Architectures=['arm64'], Tags=TAGS,
                                  PackageType='Zip', **configuration)['FunctionArn']
    wait(lambda_status, ('READY',), ('FAILED',), 'Lambda configuration')
    cfg['toolsFunctionArn'] = arn
    save(cfg)
    print('Lambda:', FUNCTION, f'{len(code) / 1048576:.1f} MB', flush=True)


def policy_engine_create(cfg):
    engines = control.list_policy_engines()['policyEngines']
    engine = next((e for e in engines if e['name'] == ENGINE), None)
    if engine:
        engine_id, engine_arn = engine['policyEngineId'], engine['policyEngineArn']
    else:
        created = control.create_policy_engine(name=ENGINE, description='Onward booking governance: traveller confirmation, budget, deadline, airline rules', tags=TAGS)
        engine_id, engine_arn = created['policyEngineId'], created['policyEngineArn']
    wait(lambda: control.get_policy_engine(policyEngineId=engine_id)['status'], ('ACTIVE',), ('FAILED',), 'Policy engine')
    cfg.update(policyEngineId=engine_id, policyEngineArn=engine_arn)
    save(cfg)
    print('Policy engine:', engine_id, 'ACTIVE', flush=True)


def gateway(cfg):
    engine_arn = cfg['policyEngineArn']
    # The gateway invokes the tools with this role and evaluates Cedar policies with it too (docs: policy-permissions).
    role_arn = ensure_role('OnwardLondon2026Gateway', 'bedrock-agentcore.amazonaws.com', [
        {'Effect': 'Allow', 'Action': ['lambda:InvokeFunction'], 'Resource': cfg['toolsFunctionArn']},
        {'Effect': 'Allow', 'Action': ['bedrock-agentcore:GetPolicyEngine', 'bedrock-agentcore:AuthorizeAction', 'bedrock-agentcore:PartiallyAuthorizeActions'],
         'Resource': [engine_arn, engine_arn + '/*', f'arn:aws:bedrock-agentcore:{REGION}:{ACCOUNT}:gateway/*']}])
    existing = next((g for g in control.list_gateways()['items'] if g['name'] == GATEWAY), None)
    protocol = {'mcp': {'instructions': 'Onward travel tools over a fictional inventory: entities, hotel retrieval, complete prices, '
                                        'journey validation, itinerary selection and booking. Every tool reads or writes real AWS data.',
                        'searchType': 'SEMANTIC'}}
    if existing:
        gateway_id = existing['gatewayId']
    else:
        created = control.create_gateway(name=GATEWAY, description='Onward London 2026 tool gateway (IAM inbound, Lambda target)',
                                         roleArn=role_arn, protocolType='MCP', protocolConfiguration=protocol, authorizerType='AWS_IAM', tags=TAGS)
        gateway_id = created['gatewayId']
    # UPDATE_UNSUCCESSFUL is terminal after a failed policy association; the gateway itself still serves.
    wait(lambda: control.get_gateway(gatewayIdentifier=gateway_id)['status'], ('READY', 'UPDATE_UNSUCCESSFUL'), ('FAILED',), 'Gateway')
    details = control.get_gateway(gatewayIdentifier=gateway_id)
    cfg.update(gatewayId=gateway_id, gatewayArn=details['gatewayArn'], gatewayUrl=details['gatewayUrl'], gatewayRoleArn=role_arn)
    save(cfg)
    print('Gateway:', gateway_id, details['gatewayUrl'], flush=True)
    schema = json.loads((ROOT / 'infra/tools-schema.json').read_text())
    target_config = {'mcp': {'lambda': {'lambdaArn': cfg['toolsFunctionArn'], 'toolSchema': {'inlinePayload': schema}}}}
    credentials = [{'credentialProviderType': 'GATEWAY_IAM_ROLE'}]
    targets = control.list_gateway_targets(gatewayIdentifier=gateway_id)['items']
    target = next((t for t in targets if t['name'] == TARGET), None)
    if target:
        control.update_gateway_target(gatewayIdentifier=gateway_id, targetId=target['targetId'], name=TARGET,
                                      description='Onward semantic-layer tools', targetConfiguration=target_config,
                                      credentialProviderConfigurations=credentials)
        target_id = target['targetId']
    else:
        target_id = control.create_gateway_target(gatewayIdentifier=gateway_id, name=TARGET, description='Onward semantic-layer tools',
                                                  targetConfiguration=target_config, credentialProviderConfigurations=credentials)['targetId']
    wait(lambda: control.get_gateway_target(gatewayIdentifier=gateway_id, targetId=target_id)['status'], ('READY',), ('FAILED',), 'Gateway target')
    cfg['gatewayTargetId'] = target_id
    save(cfg)
    print('Target:', TARGET, 'READY with', len(schema), 'tools', flush=True)
    return details


def cedar(cfg):
    arn = cfg['gatewayArn']
    reads = ', '.join(f'AgentCore::Action::"{TARGET}___{tool}"' for tool in TOOLS)
    return {
        'onward_read_tools': f'permit(principal, action in [{reads}], resource == AgentCore::Gateway::"{arn}");',
        'onward_traveller_booking': (f'permit(principal, action == AgentCore::Action::"{TARGET}___book_trip", resource == AgentCore::Gateway::"{arn}") '
                                     'when { context.input.travellerConfirmed == true && context.input.totalPence < context.input.budgetPence '
                                     '&& context.input.arrivesBeforeDeadline == true };'),
        'onward_airline_rules': (f'forbid(principal, action == AgentCore::Action::"{TARGET}___book_trip", resource == AgentCore::Gateway::"{arn}") '
                                 'when { context.input.carrier != "Aster Air" || context.input.seatsAvailable < 1 || context.input.seatSelectionIncluded == false };'),
    }


def policy_engine(cfg, gateway_details):
    engine_id, engine_arn = cfg['policyEngineId'], cfg['policyEngineArn']

    def associate(mode):
        for attempt in range(12):
            try:
                control.update_gateway(gatewayIdentifier=cfg['gatewayId'], name=GATEWAY, roleArn=cfg['gatewayRoleArn'], protocolType='MCP',
                                       protocolConfiguration=gateway_details['protocolConfiguration'], authorizerType='AWS_IAM',
                                       policyEngineConfiguration={'arn': engine_arn, 'mode': mode})
                status = wait(lambda: control.get_gateway(gatewayIdentifier=cfg['gatewayId'])['status'], ('READY', 'UPDATE_UNSUCCESSFUL'), ('FAILED',),
                              'Gateway policy association')
                if status == 'READY':
                    return
                reasons = ' '.join(control.get_gateway(gatewayIdentifier=cfg['gatewayId']).get('statusReasons', []))
                if 'not authorized' not in reasons and 'Access' not in reasons:
                    raise RuntimeError('Gateway policy association failed: ' + reasons)
            except (control.exceptions.ValidationException, control.exceptions.AccessDeniedException) as error:
                if 'not authorized' not in str(error) and 'Access denied' not in str(error):
                    raise
            if attempt == 11:
                raise RuntimeError('The gateway role permissions did not propagate in time.')
            print('Waiting for IAM propagation on the gateway role…', flush=True)
            time.sleep(15)

    # Keep enforcement on during updates. Existing policies continue to protect bookings;
    # a new engine denies by default until its policies are installed.
    associate('ENFORCE')
    listed = control.list_policy_summaries(policyEngineId=engine_id)
    existing = {p['name']: p for p in listed.get('policies', listed.get('policySummaries', []))}
    policy_ids = {}
    for name, statement in cedar(cfg).items():
        definition = {'cedar': {'statement': statement}}
        if name in existing:
            policy_id = existing[name]['policyId']
            control.update_policy(policyEngineId=engine_id, policyId=policy_id, definition=definition,
                                  validationMode='FAIL_ON_ANY_FINDINGS', enforcementMode='ACTIVE')
        else:
            policy_id = control.create_policy(policyEngineId=engine_id, name=name, definition=definition,
                                              description=name.replace('_', ' '), validationMode='FAIL_ON_ANY_FINDINGS',
                                              enforcementMode='ACTIVE')['policyId']
        wait(lambda: control.get_policy(policyEngineId=engine_id, policyId=policy_id)['status'], ('ACTIVE',), ('FAILED',), f'Policy {name}')
        policy_ids[name] = policy_id
        print('Policy:', name, 'ACTIVE', flush=True)
    associate('ENFORCE')
    cfg.update(policyIds=policy_ids, policyMode='ENFORCE')
    save(cfg)
    print('Policy engine:', engine_id, 'ENFORCE on the gateway', flush=True)


def runtime_permissions(cfg):
    policy = json.loads((ROOT / 'infra/runtime-policy.json').read_text())
    statements = [s for s in policy['Statement'] if s.get('Sid') not in ('OnwardGateway', 'OnwardObservability')]
    statements.append({'Sid': 'OnwardGateway', 'Effect': 'Allow', 'Action': ['bedrock-agentcore:InvokeGateway'], 'Resource': cfg['gatewayArn']})
    statements.append({'Sid': 'OnwardObservability', 'Effect': 'Allow',
                       'Action': ['logs:PutResourcePolicy', 'logs:DescribeLogGroups', 'logs:DescribeResourcePolicies', 'cloudwatch:PutMetricData',
                                  'xray:GetSamplingRules', 'xray:GetSamplingTargets'],
                       'Resource': '*'})
    policy['Statement'] = statements
    (ROOT / 'infra/runtime-policy.json').write_text(json.dumps(policy, indent=2) + '\n')
    iam.put_role_policy(RoleName=cfg['roleArn'].split('/')[-1], PolicyName='OnwardScopedAccess', PolicyDocument=json.dumps(policy))
    print('Runtime role: InvokeGateway and observability permissions applied.', flush=True)


def main():
    identity = SESSION.client('sts').get_caller_identity()
    if identity['Account'] != ACCOUNT:
        raise RuntimeError('Wrong AWS account; expected the authorised Isengard account.')
    cfg = json.loads(STATE.read_text())
    writer_credentials(cfg)
    tools_function(cfg)
    policy_engine_create(cfg)
    details = gateway(cfg)
    policy_engine(cfg, details)
    runtime_permissions(cfg)
    print(json.dumps({'gatewayId': cfg['gatewayId'], 'gatewayUrl': cfg['gatewayUrl'], 'toolsFunctionArn': cfg['toolsFunctionArn'],
                      'policyEngineId': cfg['policyEngineId'], 'policies': list(cfg['policyIds'])}, indent=2), flush=True)


if __name__ == '__main__':
    main()
