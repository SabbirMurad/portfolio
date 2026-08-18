#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "ufw"

ufw allow ssh
ufw allow smtp
ufw allow http
ufw allow https
ufw --force enable
ufw reload

echo "== ufw configured =="

step_done "ufw"
