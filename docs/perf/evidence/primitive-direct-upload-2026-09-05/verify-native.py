import json,os,pathlib,subprocess
root=pathlib.Path('/home/xaz/Projects/goo-gsharp')
output=pathlib.Path('/tmp/goo-direct-upload')
env=os.environ.copy()
env.update(WAYLAND_DISPLAY='goo-direct-upload-qa',VK_INSTANCE_LAYERS='VK_LAYER_KHRONOS_validation',GOO_VK_DIAGNOSTICS='1')
binary='tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.AsyncReadbackSmoke.dll'
lanes=[('direct-gate',None,'GOO_DIRECT_PRIMITIVE_UPLOAD_SMOKE'),('default-metrics',None,'GOO_PRIMITIVE_METRICS_SMOKE'),('default-retention',None,'GOO_RETENTION_SMOKE'),('default-readback',None,None),('direct-readback','direct',None),('direct-pipeline','direct','GOO_PIPELINE_IDENTITY_SMOKE'),('direct-queue-isolation','direct','GOO_QUEUE_ISOLATION_SMOKE'),('direct-timeline','direct','GOO_TIMELINE_COMPLETION_SMOKE'),('direct-pacing','direct','GOO_LIVE_FRAME_PACING_SMOKE')]
if os.environ.get("GOO_SKIP_DIRECT_GATE") == "1": lanes=lanes[1:]
results={}
for name,mode,flag in lanes:
 runenv=env.copy()
 runenv.pop('GOO_PRIMITIVE_UPLOAD_MODE',None)
 if mode: runenv['GOO_PRIMITIVE_UPLOAD_MODE']=mode
 if flag: runenv[flag]='1'
 with (output/f'{name}.log').open('w') as log:
  result=subprocess.run(['timeout','60s','dotnet',binary],cwd=root,env=runenv,stdout=log,stderr=subprocess.STDOUT)
 results[name]=result.returncode
 print(name,result.returncode,flush=True)
 (output/'native-results.json').write_text(json.dumps(results,indent=2)+'\n')
 if result.returncode: raise SystemExit(1)
