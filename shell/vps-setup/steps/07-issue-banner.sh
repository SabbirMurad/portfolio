#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "issue-banner"

cat > /etc/issue.net << 'EOF'
Sob e vober lila!
EOF

echo "== /etc/issue.net updated =="

step_done "issue-banner"
