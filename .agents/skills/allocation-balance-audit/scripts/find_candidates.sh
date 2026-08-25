#!/usr/bin/env bash
set -euo pipefail

repository="${1:-.}"

if [[ ! -d "$repository" ]]; then
  printf 'repository does not exist: %s\n' "$repository" >&2
  exit 2
fi

if ! command -v rg >/dev/null 2>&1; then
  printf 'allocation-balance-audit requires rg\n' >&2
  exit 1
fi

roots=()
for candidate in Goo Goo.InternalTextInterop; do
  if [[ -d "$repository/$candidate" ]]; then
    roots+=("$repository/$candidate")
  fi
done

if (( ${#roots[@]} == 0 )); then
  printf 'missing Goo or Goo.InternalTextInterop under: %s\n' "$repository" >&2
  exit 2
fi

scan() {
  local title="$1"
  local pattern="$2"
  printf '\n%s\n' "$title"
  rg -n --hidden \
    --glob '*.gs' --glob '*.cs' \
    --glob '!bin/**' --glob '!obj/**' --glob '!vendor/**' --glob '!.git/**' \
    "$pattern" "${roots[@]}" || true
}

scan 'Retained capacity, caches, pools, frame slots, and scratch state' '\.Clear\(\)|\.Capacity\b|TrimExcess|EnsureCapacity|ArrayPool|MemoryPool|ObjectPool|[Cc]ache|[Pp]ool|[Ss]cratch|[Ss]taging|[Ff]rame[Ss]lot|[Bb]uffer'
scan 'Retained-tree, layout, and renderer hot-path entry points' 'func (Build|Rebuild|Reconcile|Layout|Measure|Paint|Compile|Emit|Record|Submit|Present|Pump|Dispatch|Recover)\b'
scan 'Repeated collection traversal and broad invalidation' 'for .+ in .+|while .+\.Count|while .+ < .+Count|IndexOf|Find|Maximum|Minimum|Invalidate\(|MarkDirty|Rebuild\('
scan 'Allocation-sensitive public ownership and invalidation surfaces' 'public prop .*(List|Dictionary|Queue)|public func .*?(Rebuild|Invalidate|Refresh|Clear|Dispose)|public (class|interface|struct).*?(Source|Handle|Cache|Provider)'
