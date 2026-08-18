#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "mongodb-install"

apt install gnupg curl -y

curl -fsSL https://pgp.mongodb.com/server-8.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
   --dearmor --yes

# Detect the actual Ubuntu codename instead of hardcoding it
UBUNTU_CODENAME=$(lsb_release -cs)
echo "== Detected Ubuntu codename: $UBUNTU_CODENAME =="

# MongoDB 8.x apt repo currently only supports these Ubuntu releases.
# Check MongoDB's official docs if this list needs updating in the future.
SUPPORTED_CODENAMES=("jammy" "noble")

codename_supported=false
for supported in "${SUPPORTED_CODENAMES[@]}"; do
    if [[ "$UBUNTU_CODENAME" == "$supported" ]]; then
        codename_supported=true
        break
    fi
done

if [[ "$codename_supported" == false ]]; then
    echo "ERROR: Ubuntu codename '$UBUNTU_CODENAME' is not supported by MongoDB's apt repo."
    echo "Supported codenames: ${SUPPORTED_CODENAMES[*]}"
    echo "Check https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/ for current support."
    exit 1
fi

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/8.3 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-8.3.list

apt update

apt install -y mongodb-org

echo "== MongoDB installed =="

step_done "mongodb-install"
