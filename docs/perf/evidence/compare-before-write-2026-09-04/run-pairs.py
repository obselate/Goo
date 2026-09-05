import os,subprocess,json,re,sys
from pathlib import Path
root=Path('/tmp/goo-compare-staging')
lane=sys.argv[1]
modes=['unchanged','sparse','full','cold'] if lane=='probe' else ['unchanged','sparse','full']
results=[]
for turn in range(6):
 for mode in modes:
  order=['baseline','candidate'] if turn%2==0 else ['candidate','baseline']
  for variant in order:
   env=os.environ.copy();env['WAYLAND_DISPLAY']='goo-compare-qa'
   if lane=='frame':env.update(GOO_VK_DIAGNOSTICS='1',GOO_PRIMITIVE_UPLOAD_BENCHMARK='1',GOO_PRIMITIVE_UPLOAD_WORKLOAD=mode)
   runtime=root/(('probe-' if lane=='probe' else 'frame-')+variant)
   cmd=['dotnet',str(runtime/'Goo.AsyncReadbackSmoke.dll')]
   if lane=='probe':cmd.append(mode)
   proc=subprocess.run(cmd,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=90)
   log=f'{lane}-{turn+1}-{mode}-{variant}.log';(root/log).write_text(proc.stdout)
   if proc.returncode:raise RuntimeError(f'{log}: exit {proc.returncode}')
   line=next(x for x in proc.stdout.splitlines() if x.startswith('prepare-probe:' if lane=='probe' else 'retained-primitive-staging:'))
   fields=dict(re.findall(r'(\w+)=([^ ]+)',line));fields.update(turn=turn+1,variant=variant,mode=mode,log=log)
   results.append(fields);(root/(lane+'-results.json')).write_text(json.dumps(results,indent=2))
   print(lane,turn+1,mode,variant,'p50',fields['p50_ns'],'p99',fields['p99_ns'],flush=True)
