import json, os, pathlib, subprocess
root=pathlib.Path('/home/xaz/Projects/goo-gsharp')
evidence=pathlib.Path('/tmp/goo-timeline')
env=os.environ.copy()
env.update(WAYLAND_DISPLAY='goo-timeline-qa',VK_INSTANCE_LAYERS='VK_LAYER_KHRONOS_validation',GOO_VK_DIAGNOSTICS='1')
binary='tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.AsyncReadbackSmoke.dll'
lanes=[('timeline','GOO_TIMELINE_COMPLETION_SMOKE'),('readback',None),('metrics','GOO_PRIMITIVE_METRICS_SMOKE'),('retention','GOO_RETENTION_SMOKE'),('pipeline-identity','GOO_PIPELINE_IDENTITY_SMOKE'),('queue-isolation','GOO_QUEUE_ISOLATION_SMOKE'),('live-pacing','GOO_LIVE_FRAME_PACING_SMOKE')]
results={}
for name,flag in lanes:
    runenv=env.copy()
    if flag: runenv[flag]='1'
    with (evidence/f'{name}-lru-final.log').open('w') as log:
        result=subprocess.run(['timeout','60s','dotnet',binary],cwd=root,env=runenv,stdout=log,stderr=subprocess.STDOUT)
    results[name]=result.returncode
    print(name,result.returncode,flush=True)
    (evidence/'final-native-results.json').write_text(json.dumps(results,indent=2)+'\n')
    if result.returncode: raise SystemExit(1)
