#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "git-config"

prompt_if_unset git_name "Enter your full name for git: "
prompt_if_unset git_email "Enter your email address for git: "

git config --global user.name "$git_name"
git config --global user.email "$git_email"
git config --global core.editor nano
git config --global color.ui true

echo "== git configured =="

step_done "git-config"
