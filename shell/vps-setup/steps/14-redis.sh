#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "redis"

apt install redis-server -y

echo "== Redis installed =="
systemctl status redis-server --no-pager

step_done "redis"
