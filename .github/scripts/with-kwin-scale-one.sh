#!/usr/bin/env bash
set -euo pipefail

if (( $# == 0 )); then
  printf 'usage: %s command [arg ...]\n' "$0" >&2
  exit 2
fi

output="${GOO_KWIN_OUTPUT:-}"
if [[ -z "$output" ]]; then
  printf 'error: GOO_KWIN_OUTPUT is required\n' >&2
  exit 2
fi

if ! command -v kscreen-doctor >/dev/null 2>&1; then
  printf 'error: kscreen-doctor is required\n' >&2
  exit 127
fi
if ! command -v python3 >/dev/null 2>&1; then
  printf 'error: python3 is required\n' >&2
  exit 127
fi

read_scale() {
  kscreen-doctor --json 2>/dev/null |
    python3 -c '
import decimal
import json
import sys

name = sys.argv[1]
try:
    document = json.load(sys.stdin)
except (json.JSONDecodeError, TypeError, ValueError):
    raise SystemExit("invalid kscreen-doctor JSON")

outputs = document.get("outputs") if isinstance(document, dict) else None
if not isinstance(outputs, list):
    raise SystemExit("missing output list")

matches = []
for item in outputs:
    if isinstance(item, dict) and item.get("name") == name:
        matches.append(item)
if len(matches) != 1:
    raise SystemExit("missing or ambiguous output")

item = matches[0]
if item.get("enabled") is not True or item.get("connected") is not True:
    raise SystemExit("output is not enabled and connected")

scale = item.get("scale")
if isinstance(scale, bool) or scale is None:
    raise SystemExit("missing scale")
try:
    value = decimal.Decimal(str(scale))
except decimal.InvalidOperation:
    raise SystemExit("invalid scale")
if not value.is_finite() or value <= 0:
    raise SystemExit("invalid scale")

normalized = format(value, "f").rstrip("0").rstrip(".")
if not normalized:
    normalized = "0"
print(normalized)
' "$output"
}

original_scale=""
if ! original_scale="$(read_scale 2>/dev/null)" || [[ -z "$original_scale" ]]; then
  printf 'error: output %s is missing, disabled, disconnected, or ambiguous\n' "$output" >&2
  exit 1
fi

child_pid=""
cleanup_started=0

terminate_child() {
  if [[ -n "$child_pid" ]]; then
    kill -TERM "$child_pid" 2>/dev/null || true
    remaining=50
    while (( remaining > 0 )); do
      if ! kill -0 "$child_pid" 2>/dev/null; then
        break
      fi
      sleep 0.1
      remaining=$((remaining - 1))
    done
    if kill -0 "$child_pid" 2>/dev/null; then
      kill -KILL "$child_pid" 2>/dev/null || true
    fi
    wait "$child_pid" 2>/dev/null || true
    child_pid=""
  fi
}

on_signal() {
  signal_number="$1"
  if (( cleanup_started != 0 )); then
    return
  fi
  terminate_child
  exit $((128 + signal_number))
}

restore_and_exit() {
  status=$?
  if (( cleanup_started != 0 )); then
    exit "$status"
  fi
  cleanup_started=1

  restore_status=0
  restored_scale=""
  if ! kscreen-doctor "output.${output}.scale.${original_scale}" >/dev/null 2>&1; then
    restore_status=1
  elif ! restored_scale="$(read_scale 2>/dev/null)"; then
    restore_status=1
  elif [[ "$restored_scale" != "$original_scale" ]]; then
    restore_status=1
  fi

  if [[ -z "$restored_scale" ]]; then
    restored_scale=unknown
  fi
  printf 'KWin scale restored output=%s original=%s current=%s\n' "$output" "$original_scale" "$restored_scale"
  if (( restore_status != 0 )); then
    status=1
  fi
  exit "$status"
}

trap 'restore_and_exit' EXIT
trap 'on_signal 1' HUP
trap 'on_signal 2' INT
trap 'on_signal 3' QUIT
trap 'on_signal 15' TERM

if ! kscreen-doctor "output.${output}.scale.1" >/dev/null 2>&1; then
  printf 'error: failed to set output %s scale to 1\n' "$output" >&2
  exit 1
fi

current_scale=""
if ! current_scale="$(read_scale 2>/dev/null)" || [[ "$current_scale" != "1" ]]; then
  printf 'error: output %s did not report scale 1\n' "$output" >&2
  exit 1
fi
printf 'KWin scale ready output=%s original=%s current=%s\n' "$output" "$original_scale" "$current_scale"

export SDL_VIDEODRIVER=wayland

"$@" &
child_pid=$!
if wait "$child_pid"; then
  child_status=0
else
  child_status=$?
fi
child_pid=""
exit "$child_status"
