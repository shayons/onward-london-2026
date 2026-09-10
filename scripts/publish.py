"""Publish Onward to a password-protected CloudFront URL.

Static files are served from a private S3 bucket through an origin access control.
`/api/*` reaches a streaming Lambda that mirrors server.mjs and holds the only AWS
credentials. A CloudFront viewer function enforces basic auth at the edge and
rewrites the client-side /prepare route. Re-running updates code and invalidates.
"""
import base64
import json
import mimetypes
import secrets
import shutil
import time
import zipfile
from pathlib import Path

from provision import ACCOUNT, ADMIN_SECRET, CONFIG, REGION, ROOT, SESSION, TAGS

PUBLISHED = ROOT / 'infra' / 'published.json'
NAME = 'onward-london-2026'
STATIC = ['index.html', 'app.js', 'presentation.js', 'style.css',
          'data/travel.js', 'data/travel.json', 'data/README.md']
CACHING_DISABLED = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad'
CACHING_OPTIMIZED = '658327ea-f89d-4fab-a63d-7e88639e58f6'
ALL_VIEWER_EXCEPT_HOST = 'b689b0a8-53d0-40ab-baf2-68738e2966ac'

s3 = SESSION.client('s3', config=CONFIG)
iam = SESSION.client('iam', config=CONFIG)
lam = SESSION.client('lambda', config=CONFIG)
cloudfront = SESSION.client('cloudfront', config=CONFIG)


def state():
    return json.loads(PUBLISHED.read_text()) if PUBLISHED.exists() else {}


def save(value):
    PUBLISHED.write_text(json.dumps(value, indent=2) + '\n')


def site_bucket(published):
    bucket = published.setdefault('siteBucket', f'{NAME}-site-{ACCOUNT}-{REGION}')
    try:
        s3.head_bucket(Bucket=bucket)
    except s3.exceptions.ClientError:
        s3.create_bucket(Bucket=bucket)
        s3.put_public_access_block(Bucket=bucket, PublicAccessBlockConfiguration={
            'BlockPublicAcls': True, 'IgnorePublicAcls': True,
            'BlockPublicPolicy': True, 'RestrictPublicBuckets': True})
        s3.put_bucket_encryption(Bucket=bucket, ServerSideEncryptionConfiguration={
            'Rules': [{'ApplyServerSideEncryptionByDefault': {'SSEAlgorithm': 'AES256'}}]})
        s3.put_bucket_tagging(Bucket=bucket, Tagging={'TagSet': [{'Key': k, 'Value': v} for k, v in TAGS.items()]})
    return bucket


def upload_static(bucket):
    files = [ROOT / name for name in STATIC]
    files += [p for p in (ROOT / 'assets').rglob('*') if p.is_file() and p.name != '.DS_Store']
    uploaded = 0
    for path in sorted(set(files)):
        key = str(path.relative_to(ROOT))
        content_type = mimetypes.guess_type(key)[0] or 'application/octet-stream'
        if key.endswith('.js'):
            content_type = 'text/javascript'
        elif key.endswith('.md'):
            content_type = 'text/plain; charset=utf-8'
        elif key.endswith('.woff2'):
            content_type = 'font/woff2'
        cache = 'no-cache' if key.endswith(('.html', '.js', '.css', '.json')) else 'public, max-age=86400'
        s3.put_object(Bucket=bucket, Key=key, Body=path.read_bytes(),
                      ContentType=content_type, CacheControl=cache)
        uploaded += 1
    return uploaded


def execution_role(published):
    role_name = f'{NAME}-edge'
    trust = {'Version': '2012-10-17', 'Statement': [{'Effect': 'Allow',
             'Principal': {'Service': 'lambda.amazonaws.com'}, 'Action': 'sts:AssumeRole'}]}
    deployed = json.loads((ROOT / 'infra' / 'deployed.json').read_text())
    policy = {'Version': '2012-10-17', 'Statement': [
        {'Effect': 'Allow', 'Action': ['bedrock-agentcore:InvokeAgentRuntime', 'bedrock-agentcore:StopRuntimeSession'],
         'Resource': [deployed['runtimeArn'], deployed['runtimeArn'] + '/runtime-endpoint/DEFAULT']},
        {'Effect': 'Allow', 'Action': ['bedrock-agentcore:GetAgentRuntime'], 'Resource': deployed['runtimeArn']},
        {'Effect': 'Allow', 'Action': ['bedrock-agentcore:GetMemory'], 'Resource': deployed['memoryArn']},
        {'Effect': 'Allow', 'Action': ['rds-data:ExecuteStatement'], 'Resource': deployed['clusterArn']},
        {'Effect': 'Allow', 'Action': ['secretsmanager:GetSecretValue'], 'Resource': [deployed['secretArn'], ADMIN_SECRET]},
        {'Effect': 'Allow', 'Action': ['neptune-graph:GetGraph'], 'Resource': deployed['graphArn']},
        {'Effect': 'Allow', 'Action': ['s3:GetObject'], 'Resource': f"arn:aws:s3:::{deployed['bucket']}/*"},
        {'Effect': 'Allow', 'Action': ['sts:GetCallerIdentity'], 'Resource': '*'},
        {'Effect': 'Allow', 'Action': ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
         'Resource': f'arn:aws:logs:{REGION}:{ACCOUNT}:log-group:/aws/lambda/{NAME}-api:*'}]}
    try:
        arn = iam.get_role(RoleName=role_name)['Role']['Arn']
    except iam.exceptions.NoSuchEntityException:
        arn = iam.create_role(RoleName=role_name, AssumeRolePolicyDocument=json.dumps(trust),
            Description='Onward published API; the browser never holds AWS credentials.',
            Tags=[{'Key': k, 'Value': v} for k, v in TAGS.items()])['Role']['Arn']
        time.sleep(12)
    iam.put_role_policy(RoleName=role_name, PolicyName='onward-edge-access', PolicyDocument=json.dumps(policy))
    published['edgeRoleArn'] = arn
    return arn


def package():
    build = ROOT / '.build' / 'edge'
    shutil.rmtree(build, ignore_errors=True)
    build.mkdir(parents=True)
    shutil.copy2(ROOT / 'edge' / 'handler.mjs', build / 'handler.mjs')
    shutil.copy2(ROOT / 'infra' / 'deployed.json', build / 'deployed.json')
    shutil.copytree(ROOT / 'node_modules', build / 'node_modules')
    artifact = ROOT / '.build' / 'onward-edge.zip'
    with zipfile.ZipFile(artifact, 'w', zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(build.rglob('*')):
            if source.is_file():
                archive.write(source, source.relative_to(build))
    return artifact


def lambda_function(published, role_arn, artifact):
    name = f'{NAME}-api'
    secret = published.setdefault('edgeSecret', secrets.token_urlsafe(32))
    env = {'Variables': {'ONWARD_EDGE_SECRET': secret, 'ONWARD_SCENARIO_SECRET': ADMIN_SECRET,
                         'NODE_OPTIONS': '--enable-source-maps'}}
    payload = artifact.read_bytes()
    try:
        lam.get_function(FunctionName=name)
        lam.update_function_code(FunctionName=name, ZipFile=payload)
        waiter = lam.get_waiter('function_updated_v2')
        waiter.wait(FunctionName=name)
        lam.update_function_configuration(FunctionName=name, Role=role_arn, Handler='handler.handler',
            Runtime='nodejs22.x', Timeout=300, MemorySize=1024, Environment=env)
        waiter.wait(FunctionName=name)
    except lam.exceptions.ResourceNotFoundException:
        create = lambda: lam.create_function(FunctionName=name, Runtime='nodejs22.x', Role=role_arn,
            Handler='handler.handler', Code={'ZipFile': payload}, Timeout=300, MemorySize=1024,
            Environment=env, Architectures=['x86_64'],
            Description='Onward published API: streams AgentCore events to the CloudFront site.',
            Tags=TAGS)
        for attempt in range(6):          # the fresh execution role needs a moment to propagate
            try:
                create()
                break
            except lam.exceptions.InvalidParameterValueException:
                if attempt == 5:
                    raise
                time.sleep(10)
        lam.get_waiter('function_active_v2').wait(FunctionName=name)
    try:
        url = lam.get_function_url_config(FunctionName=name)
        if url['AuthType'] != 'AWS_IAM':
            url = lam.update_function_url_config(FunctionName=name, AuthType='AWS_IAM', InvokeMode='RESPONSE_STREAM')
    except lam.exceptions.ResourceNotFoundException:
        url = lam.create_function_url_config(FunctionName=name, AuthType='AWS_IAM', InvokeMode='RESPONSE_STREAM')
    try:
        lam.remove_permission(FunctionName=name, StatementId='onward-function-url')
    except lam.exceptions.ResourceNotFoundException:
        pass
    published['functionName'] = name
    published['functionUrl'] = url['FunctionUrl']
    return url['FunctionUrl'].replace('https://', '').rstrip('/'), secret


def viewer_function(published, user, password):
    name = f'{NAME}-viewer'
    token = base64.b64encode(f'{user}:{password}'.encode()).decode()
    code = f'''function handler(event) {{
  var request = event.request;
  var auth = request.headers.authorization;
  if (!auth || auth.value !== 'Basic {token}') {{
    return {{ statusCode: 401, statusDescription: 'Unauthorized',
      headers: {{ 'www-authenticate': {{ value: 'Basic realm="Onward"' }} }} }};
  }}
  var routes = ['/', '/prepare', '/prepare/', '/briefing', '/briefing/'];
  if (routes.indexOf(request.uri) !== -1) {{ request.uri = '/index.html'; }}
  return request;
}}
'''.encode()
    try:
        existing = cloudfront.describe_function(Name=name)
        cloudfront.update_function(Name=name, IfMatch=existing['ETag'], FunctionCode=code,
            FunctionConfig={'Comment': 'Onward edge auth and route rewrite', 'Runtime': 'cloudfront-js-2.0'})
    except cloudfront.exceptions.NoSuchFunctionExists:
        cloudfront.create_function(Name=name, FunctionCode=code,
            FunctionConfig={'Comment': 'Onward edge auth and route rewrite', 'Runtime': 'cloudfront-js-2.0'})
    described = cloudfront.describe_function(Name=name)
    published_fn = cloudfront.publish_function(Name=name, IfMatch=described['ETag'])
    arn = published_fn['FunctionSummary']['FunctionMetadata']['FunctionARN']
    published['viewerFunctionArn'] = arn
    return arn


def origin_access_control(published, key, origin_type, description):
    field = 'oacId' if origin_type == 's3' else 'lambdaOacId'
    if published.get(field):
        return published[field]
    for item in cloudfront.list_origin_access_controls().get('OriginAccessControlList', {}).get('Items', []):
        if item['Name'] == key:
            published[field] = item['Id']
            return item['Id']
    created = cloudfront.create_origin_access_control(OriginAccessControlConfig={
        'Name': key, 'Description': description, 'SigningProtocol': 'sigv4',
        'SigningBehavior': 'always', 'OriginAccessControlOriginType': origin_type})
    published[field] = created['OriginAccessControl']['Id']
    return published[field]


def allow_cloudfront(function_name, distribution_arn):
    for sid, action in (('AllowCloudFrontServicePrincipalUrl', 'lambda:InvokeFunctionUrl'),
                        ('AllowCloudFrontServicePrincipalInvoke', 'lambda:InvokeFunction')):
        try:
            lam.remove_permission(FunctionName=function_name, StatementId=sid)
        except lam.exceptions.ResourceNotFoundException:
            pass
        lam.add_permission(FunctionName=function_name, StatementId=sid, Action=action,
            Principal='cloudfront.amazonaws.com', SourceArn=distribution_arn)


def distribution_config(bucket, lambda_host, oac_id, lambda_oac_id, function_arn, secret):
    return {
        'CallerReference': f'{NAME}-{int(time.time())}',
        'Comment': 'Onward - semantic layer travel concierge (Data For AI Day London)',
        'Enabled': True,
        'DefaultRootObject': 'index.html',
        'HttpVersion': 'http2and3',
        'Origins': {'Quantity': 2, 'Items': [
            {'Id': 'site', 'DomainName': f'{bucket}.s3.{REGION}.amazonaws.com', 'OriginPath': '',
             'OriginAccessControlId': oac_id, 'S3OriginConfig': {'OriginAccessIdentity': ''},
             'CustomHeaders': {'Quantity': 0}, 'OriginShield': {'Enabled': False},
             'ConnectionAttempts': 3, 'ConnectionTimeout': 10},
            {'Id': 'api', 'DomainName': lambda_host, 'OriginPath': '', 'OriginShield': {'Enabled': False},
             'OriginAccessControlId': lambda_oac_id,
             'CustomOriginConfig': {'HTTPPort': 80, 'HTTPSPort': 443, 'OriginProtocolPolicy': 'https-only',
                                    'OriginSslProtocols': {'Quantity': 1, 'Items': ['TLSv1.2']},
                                    'OriginReadTimeout': 60, 'OriginKeepaliveTimeout': 60},
             'CustomHeaders': {'Quantity': 1, 'Items': [
                 {'HeaderName': 'x-onward-edge', 'HeaderValue': secret}]},
             'ConnectionAttempts': 3, 'ConnectionTimeout': 10}]},
        'DefaultCacheBehavior': {
            'TargetOriginId': 'site', 'ViewerProtocolPolicy': 'redirect-to-https',
            'AllowedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD'],
                               'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}},
            'CachePolicyId': CACHING_OPTIMIZED, 'Compress': True,
            'FunctionAssociations': {'Quantity': 1, 'Items': [
                {'FunctionARN': function_arn, 'EventType': 'viewer-request'}]}},
        'CacheBehaviors': {'Quantity': 1, 'Items': [{
            'PathPattern': '/api/*', 'TargetOriginId': 'api', 'ViewerProtocolPolicy': 'https-only',
            'AllowedMethods': {'Quantity': 7, 'Items': ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
                               'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}},
            'CachePolicyId': CACHING_DISABLED, 'OriginRequestPolicyId': ALL_VIEWER_EXCEPT_HOST,
            'Compress': False,
            'FunctionAssociations': {'Quantity': 1, 'Items': [
                {'FunctionARN': function_arn, 'EventType': 'viewer-request'}]}}]},
        'PriceClass': 'PriceClass_100',
    }


def distribution(published, bucket, lambda_host, oac_id, lambda_oac_id, function_arn, secret):
    config = distribution_config(bucket, lambda_host, oac_id, lambda_oac_id, function_arn, secret)
    if published.get('distributionId'):
        current = cloudfront.get_distribution_config(Id=published['distributionId'])
        # Merge the fields this script owns into the live config. CloudFront requires every
        # other field back verbatim, including defaults it filled in at creation time.
        live = current['DistributionConfig']
        live['Comment'] = config['Comment']
        live['DefaultRootObject'] = config['DefaultRootObject']
        wanted = {origin['Id']: origin for origin in config['Origins']['Items']}
        for origin in live['Origins']['Items']:
            origin.update(wanted.get(origin['Id'], {}))
        live['DefaultCacheBehavior'].update(config['DefaultCacheBehavior'])
        by_pattern = {behavior['PathPattern']: behavior for behavior in config['CacheBehaviors']['Items']}
        for behavior in live.get('CacheBehaviors', {}).get('Items', []):
            behavior.update(by_pattern.get(behavior['PathPattern'], {}))
        cloudfront.update_distribution(Id=published['distributionId'], IfMatch=current['ETag'], DistributionConfig=live)
        cloudfront.create_invalidation(DistributionId=published['distributionId'],
            InvalidationBatch={'Paths': {'Quantity': 1, 'Items': ['/*']}, 'CallerReference': str(time.time())})
        return published['distributionId'], published['domain']
    created = cloudfront.create_distribution_with_tags(DistributionConfigWithTags={
        'DistributionConfig': config, 'Tags': {'Items': [{'Key': k, 'Value': v} for k, v in TAGS.items()]}})
    published['distributionId'] = created['Distribution']['Id']
    published['distributionArn'] = created['Distribution']['ARN']
    published['domain'] = created['Distribution']['DomainName']
    s3.put_bucket_policy(Bucket=bucket, Policy=json.dumps({'Version': '2012-10-17', 'Statement': [
        {'Sid': 'AllowCloudFrontRead', 'Effect': 'Allow', 'Principal': {'Service': 'cloudfront.amazonaws.com'},
         'Action': 's3:GetObject', 'Resource': f'arn:aws:s3:::{bucket}/*',
         'Condition': {'StringEquals': {'AWS:SourceArn': created['Distribution']['ARN']}}}]}))
    return published['distributionId'], published['domain']


def assert_not_public(function_name, bucket):
    """Fail loudly rather than ever re-creating a world-accessible origin.

    An earlier revision used a public function URL; the account's
    lambda_function_policy_block_public_access control auto-mitigated it.
    CloudFront now signs every origin request with SigV4 through an OAC.
    """
    url = lam.get_function_url_config(FunctionName=function_name)
    if url['AuthType'] != 'AWS_IAM':
        raise RuntimeError(f'Function URL auth is {url["AuthType"]}; only AWS_IAM is permitted.')
    try:
        statements = json.loads(lam.get_policy(FunctionName=function_name)['Policy'])['Statement']
    except lam.exceptions.ResourceNotFoundException:
        statements = []
    for statement in statements:
        principal = statement.get('Principal')
        wildcard = principal in ('*', {'AWS': '*'})
        scoped = 'SourceArn' in json.dumps(statement.get('Condition', {}))
        if wildcard and not scoped:
            raise RuntimeError(f'Statement {statement.get("Sid")} makes the function world accessible.')
    blocks = s3.get_public_access_block(Bucket=bucket)['PublicAccessBlockConfiguration']
    if not all(blocks.values()):
        raise RuntimeError(f'Public access is not fully blocked on {bucket}: {blocks}')


def main():
    identity = SESSION.client('sts').get_caller_identity()
    if identity['Account'] != ACCOUNT:
        raise RuntimeError('Wrong AWS account; expected the authorised Isengard account.')
    published = state()
    user = published.setdefault('basicAuthUser', 'onward')
    password = published.setdefault('basicAuthPassword', secrets.token_urlsafe(12))
    bucket = site_bucket(published)
    uploaded = upload_static(bucket)
    role_arn = execution_role(published)
    artifact = package()
    lambda_host, secret = lambda_function(published, role_arn, artifact)
    function_arn = viewer_function(published, user, password)
    oac_id = origin_access_control(published, f'{NAME}-site', 's3', 'Onward static site')
    lambda_oac_id = origin_access_control(published, f'{NAME}-api', 'lambda', 'Onward published API')
    distribution_id, domain = distribution(published, bucket, lambda_host, oac_id, lambda_oac_id, function_arn, secret)
    allow_cloudfront(published['functionName'], published['distributionArn'])
    assert_not_public(published['functionName'], bucket)
    published['url'] = f'https://{domain}'
    published['uploadedFiles'] = uploaded
    published['artifactMB'] = round(artifact.stat().st_size / 1048576, 1)
    save(published)
    print(json.dumps({'url': published['url'], 'distributionId': distribution_id, 'files': uploaded,
                      'user': user, 'password': password, 'artifactMB': published['artifactMB']}, indent=2))


if __name__ == '__main__':
    main()
