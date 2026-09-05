import json
from pathlib import Path
import subprocess

root = Path('/home/xaz/Projects/goo-gsharp')
out = Path('/tmp/goo-prepush/final-verification')
out.mkdir(exist_ok=True)
steps = [
    ('api', ['dotnet', 'test', 'tests/Goo.ApiContractTests/Goo.ApiContractTests.csproj', '-c', 'Release', '--nologo']),
    ('async-build', ['dotnet', 'build', 'tests/Goo.AsyncReadbackSmoke/Goo.AsyncReadbackSmoke.gsproj', '-c', 'Release', '--nologo']),
    ('recovery-build', ['dotnet', 'build', 'tests/Goo.FailedIdleSmoke/Goo.FailedIdleSmoke.gsproj', '-c', 'Release', '--nologo']),
]
results = []
for name, command in steps:
    with (out / (name + '.log')).open('w') as stream:
        result = subprocess.run(command, cwd=root, stdout=stream, stderr=subprocess.STDOUT, timeout=600)
    results.append({'name': name, 'command': command, 'exit_code': result.returncode})
    (out / 'builds.json').write_text(json.dumps(results, indent=2) + '\n')
    print(name, result.returncode, flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)
