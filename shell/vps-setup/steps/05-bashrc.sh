#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "bashrc"

cat >> ~/.bashrc << 'EOF'

#Custom color for PS1.
CYAN="\e[0;36m"
BLUE="\e[0;34m"
WHITE="\e[00m"
CEND="\e[m"
RED_BACKGROUND="\e[41m"
GREEN_BACKGROUND="\e[42m"
PS1="\[$WHITE\]\[$RED_BACKGROUND\]\u\[$WHITE\]@\[$CYAN\]\h: \[$BLUE\]\w\[$CEND\]>> "
EOF

echo "== .bashrc updated =="

step_done "bashrc"
