#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "create-user"

# new_username / new_password are normally collected upfront by main.sh's
# collection phase. Fall back to asking here only if this script is
# somehow run standalone, outside of main.sh.
prompt_if_unset new_username "Enter new username: "

if [[ -z "$new_password" ]]; then
    read -s -p "Enter password for $new_username: " new_password
    echo
    read -s -p "Confirm password: " new_password_confirm
    echo

    if [[ "$new_password" != "$new_password_confirm" ]]; then
        echo "ERROR: Passwords do not match. Exiting."
        exit 1
    fi
    save_var new_password "$new_password"
fi

# Create the user with a home directory and bash as default shell
adduser --disabled-password --gecos "" "$new_username"

# Set the password non-interactively
echo "$new_username:$new_password" | chpasswd

# Add user to sudo group so they can run privileged commands
usermod -aG sudo "$new_username"

echo "== User $new_username created and added to sudo group =="

step_done "create-user"
