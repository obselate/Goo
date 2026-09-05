import hashlib
import json
import os
from pathlib import Path
import subprocess

root = Path('/home/xaz/Projects/goo-gsharp')
out = Path('/tmp/goo-prepush/final-verification')
out.mkdir(exist_ok=True)
env = os.environ.copy()
for key in list(env):
    if key.startswith('GOO_'):
        env.pop(key)
env.update(WAYLAND_DISPLAY='goo-prepush-qa', VK_INSTANCE_LAYERS='VK_LAYER_KHRONOS_validation', GOO_VK_DIAGNOSTICS='1')
async_binary = 'tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.AsyncReadbackSmoke.dll'
recovery_binary = 'tests/Goo.FailedIdleSmoke/bin/Release/net10.0/Goo.FailedIdleSmoke.dll'
lanes = [
    ('primitive-metrics', ['dotnet', async_binary], {'GOO_PRIMITIVE_METRICS_SMOKE': '1'}),
    ('retention', ['dotnet', async_binary], {'GOO_RETENTION_SMOKE': '1'}),
    ('readback', ['dotnet', async_binary], {}),
    ('pipeline-identity', ['dotnet', async_binary], {'GOO_PIPELINE_IDENTITY_SMOKE': '1'}),
    ('timeline', ['dotnet', async_binary], {'GOO_TIMELINE_COMPLETION_SMOKE': '1'}),
    ('queue-isolation', ['dotnet', async_binary], {'GOO_QUEUE_ISOLATION_SMOKE': '1'}),
    ('live-pacing', ['dotnet', async_binary], {'GOO_LIVE_FRAME_PACING_SMOKE': '1'}),
    ('recovery', ['dotnet', recovery_binary], {}),
    ('recovery-compat', ['dotnet', recovery_binary], {'GOO_VK_DISABLE_SWAPCHAIN_MAINTENANCE': '1'}),
    ('queue-wake-ci', ['bash', '/tmp/goo-notes-triage/run-native-ci.sh'], {}),
    ('timeline-ci', ['bash', '/tmp/goo-timeline/run-ci.sh'], {}),
]
results = []
for name, command, flags in lanes:
    runenv = env | flags
    log = out / (name + '.log')
    with log.open('w') as stream:
        result = subprocess.run(command, cwd=root, env=runenv, stdout=stream, stderr=subprocess.STDOUT, timeout=180)
    results.append({'name': name, 'command': command, 'flags': flags, 'exit_code': result.returncode,
                    'log': log.name, 'sha256': hashlib.sha256(log.read_bytes()).hexdigest()})
    (out / 'runs.json').write_text(json.dumps(results, indent=2) + '\n')
    print(name, result.returncode, flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)
