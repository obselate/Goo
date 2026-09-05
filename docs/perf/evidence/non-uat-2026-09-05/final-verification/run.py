import datetime, hashlib, json, os, pathlib, subprocess, sys, time
repo = pathlib.Path("/home/xaz/Projects/goo-gsharp")
root = pathlib.Path(__file__).parent
name = sys.argv[1]
command = sys.argv[2:]
env = os.environ.copy()
start = time.monotonic()
with (root / (name + ".log")).open("w") as log:
    result = subprocess.run(command, cwd=repo, env=env, stdout=log, stderr=subprocess.STDOUT)
record = {"name": name, "command": command, "cwd": str(repo), "exit_code": result.returncode, "elapsed_seconds": round(time.monotonic() - start, 3), "completed_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "environment": {key: value for key, value in env.items() if key.startswith("GOO_") or key in ("WAYLAND_DISPLAY", "SLANG_SDK", "VULKAN_SDK", "VK_INSTANCE_LAYERS")}}
record["log_sha256"] = hashlib.sha256((root / (name + ".log")).read_bytes()).hexdigest()
(root / (name + ".json")).write_text(json.dumps(record, indent=2) + "\n")
print(json.dumps(record))
if result.returncode:
    print("\n".join((root / (name + ".log")).read_text().splitlines()[-25:]))
sys.exit(result.returncode)
