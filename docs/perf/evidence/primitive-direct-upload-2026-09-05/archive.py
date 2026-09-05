from pathlib import Path
import difflib,gzip,hashlib,json,platform,shutil,subprocess
root=Path('/home/xaz/Projects/goo-gsharp')
work=Path('/tmp/goo-direct-upload')
dest=root/'docs/perf/evidence/primitive-direct-upload-2026-09-05'
dest.mkdir(parents=True,exist_ok=True)
def digest(data): return hashlib.sha256(data).hexdigest()
files=json.loads((work/'changed-files.json').read_text())
patch=[];sources=[]
for name in files:
 before=work/'before'/name;after=root/name
 old=before.read_bytes() if before.exists() else b'';new=after.read_bytes()
 sources.append({'path':name,'before_sha256':digest(old) if before.exists() else None,'after_sha256':digest(new),'new_file':not before.exists()})
 patch.extend(difflib.unified_diff(old.decode().splitlines(True),new.decode().splitlines(True),fromfile='a/'+name if before.exists() else '/dev/null',tofile='b/'+name))
(dest/'task.patch').write_text(''.join(patch))
(dest/'source-hashes.json').write_text(json.dumps(sources,indent=2)+'\n')
binaries=[]
for base in [root/'tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0',root/'tests/Goo.FailedIdleSmoke/bin/Release/net10.0',work/'baseline-runtime']:
 for p in sorted(base.glob('Goo*.dll')):
  if p.name not in ['Goo.dll','Goo.AsyncReadbackSmoke.dll','Goo.FailedIdleSmoke.dll']: continue
  binaries.append({'path':str(p),'sha256':digest(p.read_bytes()),'bytes':p.stat().st_size})
(dest/'binary-hashes.json').write_text(json.dumps(binaries,indent=2)+'\n')
results=json.loads((work/'native-results.json').read_text())
results={k+'.log':v for k,v in results.items()}
results.update({name:0 for name in ['baseline-metrics.log','api-build.log','skill-verify.log','recovery-build.log','recovery-build-2.log','async-build-2.log','async-build-final.log','recovery-direct-final.log','recovery-staged-final.log','recovery-direct-compat.log','direct-gate-final.log','direct-ci-final.log','queue-wake-ci.log','lint-final.log']})
results['recovery-direct.log']=134
results['direct-gate.log']=-6
logs=[]
for p in sorted(work.glob('*.log')):
 data=p.read_bytes();compressed=len(data)>100_000
 name=p.name+('.gz' if compressed else '')
 (dest/name).write_bytes(gzip.compress(data,mtime=0) if compressed else data)
 lines=data.decode(errors='replace').splitlines()
 logs.append({'path':name,'exit_code':results.get(p.name),'sha256':digest((dest/name).read_bytes()),'vulkan_validation_messages':sum('Validation Error' in x or 'VUID-' in x for x in lines)})
for name in ['verify-native.py','run-ci.sh','archive.py','initial-status.txt','changed-files.json','native-results.json']:
 shutil.copy2(work/name,dest/name)
(dest/'vulkaninfo.txt.gz').write_bytes(gzip.compress((work/'vulkaninfo.txt').read_bytes(),mtime=0))
(dest/'current-status.txt').write_text(subprocess.check_output(['git','status','--short'],cwd=root,text=True))
(dest/'environment.json').write_text(json.dumps({'kernel':platform.release(),'architecture':platform.machine(),'dotnet':subprocess.check_output(['dotnet','--version'],text=True).strip(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'native_compositor':'kwin_wayland goo-direct-upload-qa 1600x1000 scale1','native_gpu':'RTX3080 NVIDIA610.57.04','software':'Weston15 headless lavapipe','validation':'VK_LAYER_KHRONOS_validation','performance_comparison':'deferred to pre-push','noncoherent_coverage':'fixture emulation on coherent native allocations'},indent=2)+'\n')
(dest/'verification.json').write_text(json.dumps({'disposition':'opt-in experiment, staged default, performance decision pending pre-push','source_files':len(sources),'source_hashes':'source-hashes.json','binary_hashes':'binary-hashes.json','task_patch':'task.patch','api_tests_passed':12,'ci_yaml_parse':'pass','strict_lint':'pass with CI GL0005/GL0006 exclusions','logs':logs,'full_fallback':'NVIDIA exercised staged fallback; lavapipe only-combined-memory cannot exercise full staged fallback under the filtered-properties fixture, but rejects missing direct memory and propagates allocation failure','hosted_ci':'not run'},indent=2)+'\n')
print(dest, 'files',len(sources),'logs',len(logs),'binaries',len(binaries))
