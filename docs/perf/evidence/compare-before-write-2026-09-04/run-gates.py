import os,subprocess
from pathlib import Path
root=Path('/home/xaz/Projects/goo-gsharp');out=Path('/tmp/goo-compare-staging')
base=os.environ.copy();base.update(WAYLAND_DISPLAY='goo-compare-qa',VK_INSTANCE_LAYERS='VK_LAYER_KHRONOS_validation',GOO_VK_DIAGNOSTICS='1')
for name,flag in [('metrics-native','GOO_PRIMITIVE_METRICS_SMOKE'),('retention','GOO_RETENTION_SMOKE'),('queue-isolation','GOO_QUEUE_ISOLATION_SMOKE'),('live-pacing','GOO_LIVE_FRAME_PACING_SMOKE')]:
 env=base.copy();env[flag]='1'
 with (out/(os.environ.get('GOO_GATE_LOG_PREFIX','')+name+'.log')).open('w') as log:
  r=subprocess.run(['dotnet','tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.AsyncReadbackSmoke.dll'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=90)
 print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
for name,script in [('metrics-ci','/tmp/goo-upload-metrics-ci.sh'),('queue-ci','/tmp/goo-notes-triage/run-native-ci.sh')]:
 with (out/(os.environ.get('GOO_GATE_LOG_PREFIX','')+name+'.log')).open('w') as log:r=subprocess.run(['bash',script],cwd=root,stdout=log,stderr=subprocess.STDOUT,timeout=90)
 print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
