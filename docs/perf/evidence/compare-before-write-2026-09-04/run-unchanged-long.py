import os,subprocess,json,re
from pathlib import Path
root=Path('/tmp/goo-compare-staging');results=[]
for turn in range(4):
 for variant in (['baseline','candidate'] if turn%2==0 else ['candidate','baseline']):
  env=os.environ.copy();env.update(WAYLAND_DISPLAY='goo-compare-qa',GOO_VK_DIAGNOSTICS='1',GOO_PRIMITIVE_UPLOAD_BENCHMARK='1',GOO_PRIMITIVE_UPLOAD_WORKLOAD='unchanged',GOO_PRIMITIVE_UPLOAD_WARMUP='2000',GOO_PRIMITIVE_UPLOAD_SAMPLES='10000')
  proc=subprocess.run(['dotnet',str(root/('frame-'+variant)/'Goo.AsyncReadbackSmoke.dll')],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=90)
  log=f'unchanged-long-{turn+1}-{variant}.log';(root/log).write_text(proc.stdout)
  if proc.returncode:raise RuntimeError(log)
  line=next(x for x in proc.stdout.splitlines() if x.startswith('retained-primitive-staging:'))
  fields=dict(re.findall(r'(\w+)=([^ ]+)',line));fields.update(turn=turn+1,variant=variant,log=log);results.append(fields)
  (root/'unchanged-long-results.json').write_text(json.dumps(results,indent=2))
  print(turn+1,variant,'p50',fields['p50_ns'],'p99',fields['p99_ns'],flush=True)
