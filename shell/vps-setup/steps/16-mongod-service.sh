#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "mongod-service"

MONGOD_SERVICE="/lib/systemd/system/mongod.service"
cp "$MONGOD_SERVICE" "${MONGOD_SERVICE}.bak"

sed -i 's|^ExecStart=/usr/bin/mongod --config /etc/mongod.conf$|ExecStart=/usr/bin/mongod --port 27017 --dbpath /var/lib/mongodb/ --replSet rs0 --bind_ip 127.0.0.1 --config /etc/mongod.conf|' "$MONGOD_SERVICE"

systemctl daemon-reload
systemctl start mongod

echo "== mongod.service updated and mongod started =="

echo "== Waiting for mongod to be ready =="

# Poll until mongod actually accepts connections, rather than assuming
# it's ready immediately after systemctl start returns
max_attempts=30
attempt=0
until mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
        echo "ERROR: mongod did not become ready in time."
        exit 1
    fi
    sleep 1
done

echo "== mongod is ready =="

echo "== Initiating replica set =="
mongosh --eval "rs.initiate()"

echo "== Replica set initiated =="

step_done "mongod-service"
