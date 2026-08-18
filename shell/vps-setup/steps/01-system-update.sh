#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "system-update"

echo "== Updating package lists =="
apt update

echo "== Upgradable packages =="
apt list --upgradable

echo "== Upgrading packages =="
apt upgrade -y -o Dpkg::Options::="--force-confold"

echo "== Removing unused packages =="
apt autoremove -y

step_done "system-update"
