"""Publish the ARM64 ZIP as an IAM-authenticated Onward AgentCore runtime."""
import json
import shutil
import subprocess
import zipfile

from provision import ACCOUNT, ROOT, SESSION, CONFIG

# The runtime is ARM64 CPython 3.13, so dependencies are resolved for that target rather than
# for this laptop. Keeping this in the deploy step means backend/requirements.txt is the only
# place a dependency is declared.
PLATFORM = ('--python-platform', 'aarch64-manylinux2014', '--python-version', '3.13')


def sync_dependencies(package):
    shutil.rmtree(package, ignore_errors=True)
    package.mkdir(parents=True)
    subprocess.run(['uv', 'pip', 'install', '--quiet', '--target', str(package), *PLATFORM,
                    '--only-binary=:all:', '-r', str(ROOT / 'backend/requirements.lock')], check=True)


def main():
    if SESSION.client('sts', config=CONFIG).get_caller_identity()['Account'] != ACCOUNT:
        raise RuntimeError('Wrong AWS account; expected the authorised Onward account.')
    state_path = ROOT / 'infra/deployed.json'
    cfg = json.loads(state_path.read_text())
    package = ROOT / '.build/package'
    sync_dependencies(package)
    for filename in ('main.py', 'services.py', 'planner.py', 'models.py', 'gateway_auth.py', 'conversation.py'):
        shutil.copy2(ROOT / 'backend' / filename, package / filename)
    shutil.copy2(state_path, package / 'deployed.json')
    artifact = ROOT / '.build/onward.zip'
    with zipfile.ZipFile(artifact, 'w', zipfile.ZIP_DEFLATED) as archive:
        for source in package.rglob('*'):
            if source.is_file() and '__pycache__' not in source.parts:
                archive.write(source, source.relative_to(package))
    s3 = SESSION.client('s3', config=CONFIG)
    key = 'runtime/onward.zip'
    s3.upload_file(str(artifact), cfg['bucket'], key, ExtraArgs={'ExpectedBucketOwner': cfg['accountId'], 'ServerSideEncryption': 'AES256'})
    version = s3.head_object(Bucket=cfg['bucket'], Key=key)['VersionId']
    runtime = SESSION.client('bedrock-agentcore-control', config=CONFIG)
    request = {'agentRuntimeArtifact': {'codeConfiguration': {'code': {'s3': {'bucket': cfg['bucket'], 'prefix': key, 'versionId': version}},
        'runtime': 'PYTHON_3_13', 'entryPoint': ['main.py']}}, 'roleArn': cfg['roleArn'],
        'networkConfiguration': {'networkMode': 'PUBLIC'}, 'protocolConfiguration': {'serverProtocol': 'HTTP'},
        'lifecycleConfiguration': {'idleRuntimeSessionTimeout': 300, 'maxLifetime': 1800},
        'environmentVariables': {'PYTHONUNBUFFERED': '1', 'ONWARD_CONFIG': 'deployed.json', 'AGENT_OBSERVABILITY_ENABLED': 'true',
            'OTEL_PYTHON_DISTRO': 'aws_distro', 'OTEL_PYTHON_CONFIGURATOR': 'aws_configurator', 'UNIFIED_TRACES_DESTINATION_ENABLED': 'true'}}
    if cfg.get('runtimeId'):
        result = runtime.update_agent_runtime(agentRuntimeId=cfg['runtimeId'], **request)
    else:
        result = runtime.create_agent_runtime(agentRuntimeName='onward_london_2026',
            description='Onward travel concierge with six semantic components and live AWS tools',
            tags={'Project': 'onward-london-2026'}, **request)
    cfg.update(runtimeId=result['agentRuntimeId'], runtimeArn=result['agentRuntimeArn'], runtimeVersion=result['agentRuntimeVersion'], artifactVersion=version)
    state_path.write_text(json.dumps(cfg, indent=2) + '\n')
    print(json.dumps({'runtimeId': cfg['runtimeId'], 'version': cfg['runtimeVersion'], 'status': result['status'], 'zipMB': round(artifact.stat().st_size/1024/1024, 1)}), flush=True)
    logs = SESSION.client('logs', config=CONFIG)
    group = f'/aws/bedrock-agentcore/runtimes/{cfg["runtimeId"]}-DEFAULT'
    try:
        logs.create_log_group(logGroupName=group, kmsKeyId=cfg['logKeyArn'], tags={'Project': 'onward-london-2026'})
    except logs.exceptions.ResourceAlreadyExistsException:
        logs.associate_kms_key(logGroupName=group, kmsKeyId=cfg['logKeyArn'])
    logs.put_retention_policy(logGroupName=group, retentionInDays=7)
    cfg['logGroup'] = group
    state_path.write_text(json.dumps(cfg, indent=2) + '\n')


if __name__ == '__main__':
    main()
