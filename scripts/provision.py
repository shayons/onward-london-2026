"""Provision only Onward resources; reuse the existing Aurora cluster via Data API."""
import json
import secrets
import string
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.config import Config

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / 'infra' / 'deployed.json'
REGION = 'us-east-1'
ACCOUNT = '619763002613'
CLUSTER = f'arn:aws:rds:{REGION}:{ACCOUNT}:cluster:meridian-demo'
ADMIN_SECRET = f'arn:aws:secretsmanager:{REGION}:{ACCOUNT}:secret:meridian-demo-credentials-W0pH9X'
SESSION = boto3.Session(region_name=REGION)
CONFIG = Config(connect_timeout=10, read_timeout=120, retries={'total_max_attempts': 3, 'mode': 'standard'})
DATA = SESSION.client('rds-data', config=CONFIG)
TAGS = {'Project': 'onward-london-2026', 'Purpose': 'semantic-layer-demo'}
# Models the presenter may select at run time. Mirrored into deployed.json so the runtime,
# the local proxy and the browser all read one list.
SELECTABLE_MODELS = {
    'us.anthropic.claude-sonnet-5': 'Claude Sonnet 5',
    'us.anthropic.claude-opus-5': 'Claude Opus 5',
    'us.anthropic.claude-haiku-4-5-20251001-v1:0': 'Claude Haiku 4.5',
    'us.openai.gpt-5.6-luna': 'GPT-5.6 Luna',
}


def sql(query, database='postgres', parameters=None):
    result = DATA.execute_statement(resourceArn=CLUSTER, secretArn=ADMIN_SECRET,
        database=database, sql=query, parameters=parameters or [], formatRecordsAs='JSON')
    return json.loads(result.get('formattedRecords', '[]'))


def save(state):
    STATE.write_text(json.dumps(state, indent=2) + '\n')


def main():
    identity = SESSION.client('sts').get_caller_identity()
    if identity['Account'] != ACCOUNT:
        raise RuntimeError('Wrong AWS account; expected the authorised Isengard account.')
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    state.update(region=REGION, accountId=ACCOUNT, clusterArn=CLUSTER, clusterId='meridian-demo', database='onward', modelId='us.anthropic.claude-sonnet-5', embeddingModelId='amazon.titan-embed-text-v2:0', selectableModels=SELECTABLE_MODELS)
    if not sql("SELECT datname FROM pg_database WHERE datname='onward'"):
        sql('CREATE DATABASE onward')
    sql('CREATE EXTENSION IF NOT EXISTS vector', 'onward')
    print('Aurora: isolated onward database and pgvector ready.', flush=True)

    sm = SESSION.client('secretsmanager', config=CONFIG)
    secret_name = 'onward/london-2026/database-reader'
    role = 'onward_london_2026_reader'
    if 'secretArn' not in state:
        try:
            state['secretArn'] = sm.describe_secret(SecretId=secret_name)['ARN']
        except sm.exceptions.ResourceNotFoundException:
            password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(40))
            if sql(f"SELECT rolname FROM pg_roles WHERE rolname='{role}'"):
                raise RuntimeError('Reader role exists without its secret; resolve this explicitly.')
            # The random password never enters logs, files or subprocess arguments.
            sql(f"CREATE ROLE {role} LOGIN PASSWORD '{password}'")
            state['secretArn'] = sm.create_secret(Name=secret_name,
                SecretString=json.dumps({'username': role, 'password': password,
                    'engine': 'postgres', 'host': 'meridian-demo.cluster-c2twt17nzzpq.us-east-1.rds.amazonaws.com',
                    'port': 5432, 'dbname': 'onward'}),
                Tags=[{'Key': k, 'Value': v} for k, v in TAGS.items()])['ARN']
            del password
    sql(f'GRANT CONNECT ON DATABASE onward TO {role}')
    save(state)

    s3 = SESSION.client('s3', config=CONFIG)
    bucket = f'onward-london-2026-{ACCOUNT}-{REGION}'
    if 'bucket' not in state:
        s3.create_bucket(Bucket=bucket)
        state['bucket'] = bucket
        save(state)
    s3.put_public_access_block(Bucket=bucket, PublicAccessBlockConfiguration={
        'BlockPublicAcls': True, 'IgnorePublicAcls': True, 'BlockPublicPolicy': True, 'RestrictPublicBuckets': True})
    s3.put_bucket_versioning(Bucket=bucket, VersioningConfiguration={'Status': 'Enabled'})
    s3.put_bucket_tagging(Bucket=bucket, Tagging={'TagSet': [{'Key': k, 'Value': v} for k, v in TAGS.items()]})

    control = SESSION.client('bedrock-agentcore-control', config=CONFIG)
    if 'memoryId' not in state:
        memory = control.create_memory(name='onward_london_2026',
            description='Fictional Onward traveller conversations and memory showcase',
            eventExpiryDuration=7, memoryStrategies=[
                {'userPreferenceMemoryStrategy': {
                    'name': 'OnwardPreferences',
                    'namespaceTemplates': ['/onward/actors/{actorId}/preferences/']}},
                {'semanticMemoryStrategy': {
                    'name': 'OnwardFacts',
                    'namespaceTemplates': ['/onward/actors/{actorId}/facts/']}},
                {'summaryMemoryStrategy': {
                    'name': 'OnwardSessionSummary',
                    'namespaceTemplates': ['/onward/actors/{actorId}/summaries/{sessionId}/']}},
                {'episodicMemoryStrategy': {
                    'name': 'OnwardEpisodes',
                    'namespaceTemplates': ['/onward/actors/{actorId}/episodes/{sessionId}/'],
                    'reflectionConfiguration': {'namespaceTemplates': [
                        '/onward/actors/{actorId}/episodes/']}}},
            ], tags=TAGS)['memory']
        state.update(memoryId=memory['id'], memoryArn=memory['arn'])
        save(state)
    print('AgentCore Memory:', state['memoryId'], flush=True)

    graph = SESSION.client('neptune-graph', config=CONFIG)
    if 'graphId' not in state:
        created = graph.create_graph(graphName='onward-london-2026', provisionedMemory=16,
            replicaCount=0, publicConnectivity=True, deletionProtection=False, tags=TAGS)
        state.update(graphId=created['id'], graphArn=created['arn'])
        save(state)
    print('Neptune Analytics:', state['graphId'], '(16 m-NCUs, no replica)', flush=True)

    kms = SESSION.client('kms', config=CONFIG)
    if 'logKeyArn' not in state:
        policy = {'Version': '2012-10-17', 'Statement': [
            {'Sid': 'AccountAdministration', 'Effect': 'Allow', 'Principal': {'AWS': f'arn:aws:iam::{ACCOUNT}:root'}, 'Action': 'kms:*', 'Resource': '*'},
            {'Sid': 'OnwardLogEncryption', 'Effect': 'Allow', 'Principal': {'Service': f'logs.{REGION}.amazonaws.com'},
             'Action': ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'], 'Resource': '*',
             'Condition': {'ArnLike': {'kms:EncryptionContext:aws:logs:arn': f'arn:aws:logs:{REGION}:{ACCOUNT}:log-group:/aws/bedrock-agentcore/runtimes/onward_london_2026*'}}}]}
        key = kms.create_key(Description='Onward runtime log encryption', Policy=json.dumps(policy),
            Tags=[{'TagKey': k, 'TagValue': v} for k, v in TAGS.items()])['KeyMetadata']
        state['logKeyArn'] = key['Arn']
        save(state)

    iam = SESSION.client('iam', config=CONFIG)
    role_name = 'OnwardLondon2026Runtime'
    trust = {'Version': '2012-10-17', 'Statement': [{'Effect': 'Allow', 'Principal': {'Service': 'bedrock-agentcore.amazonaws.com'},
        'Action': 'sts:AssumeRole', 'Condition': {'StringEquals': {'aws:SourceAccount': ACCOUNT},
        'ArnLike': {'aws:SourceArn': f'arn:aws:bedrock-agentcore:{REGION}:{ACCOUNT}:*'}}}]}
    try:
        runtime_role = iam.get_role(RoleName=role_name)['Role']
    except iam.exceptions.NoSuchEntityException:
        runtime_role = iam.create_role(RoleName=role_name, AssumeRolePolicyDocument=json.dumps(trust),
            Tags=[{'Key': k, 'Value': v} for k, v in TAGS.items()])['Role']
    state['roleArn'] = runtime_role['Arn']
    statements = [
        {'Effect': 'Allow', 'Action': ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'], 'Resource': [
            *[f'arn:aws:bedrock:{REGION}:{ACCOUNT}:inference-profile/{model}' for model in SELECTABLE_MODELS],
            *[f'arn:aws:bedrock:us-*::foundation-model/{model.split(".", 1)[1]}' for model in SELECTABLE_MODELS],
            f'arn:aws:bedrock:{REGION}::foundation-model/amazon.titan-embed-text-v2:0']},
        {'Effect': 'Allow', 'Action': ['rds-data:ExecuteStatement'], 'Resource': CLUSTER},
        {'Effect': 'Allow', 'Action': ['secretsmanager:GetSecretValue'], 'Resource': state['secretArn']},
        {'Effect': 'Allow', 'Action': ['s3:GetObject', 's3:GetObjectVersion'], 'Resource': f'arn:aws:s3:::{bucket}/*'},
        {'Effect': 'Allow', 'Action': ['s3:ListBucket'], 'Resource': f'arn:aws:s3:::{bucket}'},
        {'Effect': 'Allow', 'Action': ['neptune-graph:ReadDataViaQuery'], 'Resource': state['graphArn']},
        {'Effect': 'Allow', 'Action': ['bedrock-agentcore:CreateEvent', 'bedrock-agentcore:ListEvents', 'bedrock-agentcore:RetrieveMemoryRecords', 'bedrock-agentcore:ListMemoryRecords', 'bedrock-agentcore:GetMemoryRecord'], 'Resource': state['memoryArn']},
        {'Effect': 'Allow', 'Action': ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'logs:DescribeLogStreams'], 'Resource': f'arn:aws:logs:{REGION}:{ACCOUNT}:log-group:/aws/bedrock-agentcore/runtimes/onward_london_2026*'},
        {'Effect': 'Allow', 'Action': ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'], 'Resource': '*'}]
    policy = {'Version': '2012-10-17', 'Statement': statements}
    (ROOT / 'infra' / 'runtime-policy.json').write_text(json.dumps(policy, indent=2) + '\n')
    (ROOT / 'infra' / 'runtime-trust.json').write_text(json.dumps(trust, indent=2) + '\n')
    iam.put_role_policy(RoleName=role_name, PolicyName='OnwardScopedAccess', PolicyDocument=json.dumps(policy))
    save(state)
    print('Scoped runtime role and deployment configuration ready.', flush=True)


if __name__ == '__main__':
    main()
