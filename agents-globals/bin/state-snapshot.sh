#!/usr/bin/env bash
# state-snapshot.sh — one line per repository describing state that changes between turns.
#
# Usage:
#   bun ~/.agents/bin/state-snapshot.sh <dir> [<dir> ...]
#   bun ~/.agents/bin/state-snapshot.sh .        # the repository of the current directory
#
# Purpose: the global kernel (§2, "Same-turn evidence for mutable state") forbids claiming git state,
# commits or pending work from memory or from an earlier turn. This script is the only accepted
# evidence for those claims: copy its output verbatim. `dirty` means `git status --porcelain` is not
# empty; the count is the number of changed paths. A directory that is not a repository prints
# `no-repo` — never guess.
#
# Read-only: it only runs `git rev-parse`, `git status --porcelain`, `git log -1` and `git branch`.
set -u

if [ "$#" -eq 0 ]; then
  echo "usage: state-snapshot.sh <dir> [<dir> ...]" >&2
  exit 2
fi

stamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

for dir in "$@"; do
  if [ ! -d "$dir" ]; then
    printf "%s  %-28s  missing\n" "$stamp" "$dir"
    continue
  fi

  if ! git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf "%s  %-28s  no-repo\n" "$stamp" "$dir"
    continue
  fi

  name=$(basename "$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)")
  branch=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)
  head=$(git -C "$dir" log -1 --format='%h %s' 2>/dev/null)
  changed=$(git -C "$dir" status --porcelain 2>/dev/null | wc -l | tr -d ' ')

  if [ "$changed" = "0" ]; then
    state="clean"
  else
    state="dirty(${changed})"
  fi

  printf "%s  %-28s  %-12s  %-10s  %s\n" "$stamp" "$name" "$branch" "$state" "$head"
done
