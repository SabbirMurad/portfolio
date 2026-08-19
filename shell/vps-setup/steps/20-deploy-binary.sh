#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "deploy-binary"

prompt_if_unset dir_name "Enter directory name (under /www/): "
prompt_if_unset service_name "Enter service name: "
prompt_if_unset drive_url "Enter Google Drive link to the exe file: "

# gdown isn't part of a base image -- install it (and pip, if missing) first
if ! command -v gdown &> /dev/null; then
    echo "== Installing gdown =="

    if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
        echo "== pip not found, installing python3-pip =="
        apt install python3-pip -y
    fi

    pip install gdown --break-system-packages
fi

PROJECT_DIR="/www/${dir_name}"
BINARY_PATH="${PROJECT_DIR}/${dir_name}"

echo "== Downloading binary from Google Drive =="
cd "$PROJECT_DIR"
gdown "$drive_url" -O "$BINARY_PATH"

echo "== Setting binary permissions =="
chmod 755 "$BINARY_PATH"

echo "== Starting ${service_name}.socket =="
systemctl start "${service_name}.socket"

echo "== ${service_name}.socket started, server is live =="

step_done "deploy-binary"
