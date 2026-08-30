#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
git add -A
echo "Git staging complete: $(git diff --cached --name-only | wc -l | tr -d ' ') paths staged."
