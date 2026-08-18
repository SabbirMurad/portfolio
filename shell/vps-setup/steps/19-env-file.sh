#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "env-file"

prompt_if_unset dir_name "Enter directory name (under /www/): "
prompt_if_unset http_port "Enter HTTP port: "
prompt_if_unset https_port "Enter HTTPS port: "
prompt_if_unset domain_name "Enter your domain name (e.g. example.com): "
prompt_if_unset smtp_email "Enter SMTP email: "
prompt_if_unset smtp_password "Enter SMTP password: " -s
prompt_if_unset smtp_project_name "Enter SMTP project name: "

SESSION_KEY=$(openssl rand -hex 32)      # 64 hex chars
DEV_KEY=$(openssl rand -hex 16)          # 32 hex chars
JWT_ACCESS_KEY=$(openssl rand -hex 16)   # 32 hex chars
JWT_REFRESH_KEY=$(openssl rand -hex 16)  # 32 hex chars

cat > "/www/${dir_name}/.env" << EOF
# Development Mode
APP_STAGE="release"
APP_HOST=0.0.0.0
APP_HTTP_PORT=${http_port}
APP_HTTPS_PORT=${https_port}
APP_HTTP="deny"

# Mongo
MONGO_HOST="127.0.0.1"
MONGO_PORT=27017

# Redis
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379

# TLS Certificates
TLS_KEY="/etc/letsencrypt/live/${domain_name}/privkey.pem"
TLS_CERT="/etc/letsencrypt/live/${domain_name}/cert.pem"

SESSION_KEY="${SESSION_KEY}"

# Allows devs to call certain api
ALLOW_DEV="true"
DEV_KEY="${DEV_KEY}"

# JWT SECRET KEYS
JWT_LOCAL_ACCESS_KEY="${JWT_ACCESS_KEY}"
JWT_LOCAL_REFRESH_KEY="${JWT_REFRESH_KEY}"

# Sqlite paths
SQLITE_IMG_PATH="../database/${dir_name}-image.db"
SQLITE_JWT_PATH="../database/${dir_name}-jwt.db"

#smtp
SMTP_EMAIL="${smtp_email}"
SMTP_PASSWORD="${smtp_password}"
SMTP_PROJECT_NAME="${smtp_project_name}"
EOF

chmod 600 "/www/${dir_name}/.env"

echo "== .env file created =="

step_done "env-file"
