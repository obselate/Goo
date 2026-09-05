import os,subprocess,json,re
from pathlib import Path
root=Path('/tmp/goo-pipeline-identity');results=[]
for turn in range(6):
 for mode,count in [('shared',32),('duplicate',32)]:
  for variant in (['baseline','candidate'] if turn%2==0 else ['candidate','baseline']):
   env=os.environ.copy();env['WAYLAND_DISPLAY']='goo-pipeline-qa'
   proc=subprocess.run(['dotnet',str(root/('probe-'+variant)/'Goo.AsyncReadbackSmoke.dll'),mode,str(count)],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=60)
   log=f'pair-{turn+1}-{mode}-{variant}.log';(root/log).write_text(proc.stdout)
   if proc.returncode:raise RuntimeError(log)
   line=next(x for x in proc.stdout.splitlines() if x.startswith('pipeline-probe:'))
   fields=dict(re.findall(r'(\w+)=([^ ]+)',line));fields.update(turn=turn+1,variant=variant,log=log)
   results.append(fields);(root/'results.json').write_text(json.dumps(results,indent=2))
   print(turn+1,mode,variant,'pipelines',fields['unique_handles'],'resolve_ns',fields['resolve_ns'],'warm_p50_batch_ns',fields['warm_p50_batch_ns'],'warm_p99_batch_ns',fields['warm_p99_batch_ns'],flush=True)
