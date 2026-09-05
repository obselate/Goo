import json, os, pathlib, subprocess
root=pathlib.Path('/home/xaz/Projects/goo-gsharp')
evidence=pathlib.Path('/tmp/goo-timeline')
env=os.environ.copy()
env.update(WAYLAND_DISPLAY='goo-timeline-qa', VK_INSTANCE_LAYERS='VK_LAYER_KHRONOS_validation', GOO_VK_DIAGNOSTICS='1', GOO_GPU_TIMESTAMPS_SMOKE='1')
candidate=root/'tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.AsyncReadbackSmoke.dll'
baseline=evidence/'baseline-runtime/Goo.AsyncReadbackSmoke.dll'
results=[]
for run in range(4):
    processes=[]
    for name, binary in [('candidate',candidate)] + ([] if run==0 else [('baseline',baseline)]):
        log=evidence/f'timestamp-lru-{run}-{name}.log'
        handle=log.open('w')
        process=subprocess.Popen(['timeout','60s','dotnet',str(binary)],cwd=root,env=env,stdout=handle,stderr=subprocess.STDOUT)
        processes.append((name,process,handle))
    result={}
    for name,process,handle in processes:
        result[name]=process.wait()
        handle.close()
    results.append(result)
    print(run,result,flush=True)
    (evidence/'timestamp-lru-results.json').write_text(json.dumps(results,indent=2)+'\n')
    if any(result.values()):
        raise SystemExit(1)
