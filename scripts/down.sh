#!/usr/bin/env bash
# postgres 까지 모두 정지.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose down
echo "✓ stopped"
