#!/usr/bin/env bash
set -euo pipefail

runtime_root="$(mktemp -d "${RUNNER_TEMP:-/tmp}/goo-xdg-runtime.XXXXXX")"
export XDG_RUNTIME_DIR="$runtime_root"
export WAYLAND_DISPLAY="${GOO_WAYLAND_DISPLAY:-goo-wayland}"
export GOO_HEADLESS_WAYLAND=1
weston_log="$runtime_root/weston.log"

cleanup() {
  status=$?
  kill "$weston_pid" 2>/dev/null || true
  wait "$weston_pid" 2>/dev/null || true
  if (( status != 0 )); then
    cat "$weston_log"
  fi
  rm -rf -- "$runtime_root"
  exit "$status"
}
trap cleanup EXIT

weston --backend=headless-backend.so --renderer="${GOO_WESTON_RENDERER:-pixman}" \
  --socket="$WAYLAND_DISPLAY" --idle-time=0 >"$weston_log" 2>&1 &
weston_pid=$!
for _ in $(seq 1 50); do
  test -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" && break
  sleep 0.1
done
test -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY"

"$@"
