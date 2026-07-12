#!/usr/bin/env bash
# Wrapper for the AssureCars dealer config generator.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV="$SCRIPT_DIR/.venv"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <dealer-id> [--validate-only]" >&2
  echo "Example: $0 acme-motors" >&2
  exit 1
fi

if [[ ! -d "$VENV" ]]; then
  echo "Creating Python venv at tools/configure/.venv ..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q -r "$SCRIPT_DIR/requirements.txt"
fi

exec "$VENV/bin/python" "$SCRIPT_DIR/generate.py" "$@"
