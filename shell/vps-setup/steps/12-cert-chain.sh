#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "cert-chain"

prompt_if_unset domain_name "Enter your domain name (e.g. example.com): "

CERT_DIR="/etc/letsencrypt/live/$domain_name"

echo "" >> "$CERT_DIR/cert.pem"
cat "$CERT_DIR/chain.pem" >> "$CERT_DIR/cert.pem"

echo "== cert.pem updated with chain contents appended =="

step_done "cert-chain"
