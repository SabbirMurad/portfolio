#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "certbot"

echo "== Installing certbot =="
apt install certbot -y

prompt_if_unset domain_name "Enter your domain name (without www or https://, e.g. example.com): "

echo "== Requesting SSL certificate =="
certbot certonly --standalone -d "$domain_name" -d "www.$domain_name"

echo "== Certificate obtained for $domain_name and www.$domain_name =="

step_done "certbot"
