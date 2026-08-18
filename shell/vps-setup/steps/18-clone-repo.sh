#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "clone-repo"

prompt_if_unset dir_name "Enter directory name (under /www/): "
prompt_if_unset github_url "Enter GitHub repository URL (e.g. https://github.com/user/repo.git): "

if [[ -d /www ]]; then
    echo "/www already exists, skipping creation"
else
    mkdir /www
    echo "/www created"
fi

if [[ -d /www/database ]]; then
    echo "/www/database already exists, skipping creation"
else
    mkdir /www/database
    echo "/www/database created"
fi

cd /www

# needs_auth / github_username / github_token are collected upfront by
# main.sh's collection phase. Fall back to asking here only if this
# script is somehow run standalone, outside of main.sh.
if [[ -z "$needs_auth" ]]; then
    read -p "Does this repository require authentication? (y/n): " needs_auth
    save_var needs_auth "$needs_auth"
fi

if [[ "$needs_auth" =~ ^[Yy]$ ]]; then
    prompt_if_unset github_username "Enter GitHub username: "
    if [[ -z "$github_token" ]]; then
        read -s -p "Enter GitHub personal access token: " github_token
        echo
        save_var github_token "$github_token"
    fi
    # Inject credentials into the URL for an authenticated clone
    auth_url=$(echo "$github_url" | sed -E "s#https://#https://${github_username}:${github_token}@#")
    git clone "$auth_url" "$dir_name"
else
    git clone "$github_url" "$dir_name"
fi

echo "== Repository cloned into /www/${dir_name} =="

step_done "clone-repo"
