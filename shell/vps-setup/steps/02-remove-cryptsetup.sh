#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "remove-cryptsetup"

apt remove -y cryptsetup || echo "cryptsetup not installed, skipping"

step_done "remove-cryptsetup"
