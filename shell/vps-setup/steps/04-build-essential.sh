#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "build-essential"

echo "== Installing build-essential =="
apt install build-essential -y

echo "== Checking gcc version =="
gcc --version

step_done "build-essential"
