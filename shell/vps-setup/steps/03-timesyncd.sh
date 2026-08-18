#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "timesyncd"

TIMESYNC_CONF="/etc/systemd/timesyncd.conf"

# Back up the original first, just in case
cp "$TIMESYNC_CONF" "${TIMESYNC_CONF}.bak"

# Remove everything from [Time] onward (if it exists)
sed -i '/^\[Time\]/,$d' "$TIMESYNC_CONF"

# Append the new [Time] block
cat >> "$TIMESYNC_CONF" << 'EOF'

[Time]
NTP=0.asia.pool.ntp.org 1.asia.pool.ntp.org 2.asia.pool.ntp.org 3.asia.pool.ntp.org
FallbackNTP=ntp.ubuntu.com 0.arch.pool.ntp.org
EOF

# Restart the service so the new config takes effect
systemctl restart systemd-timesyncd

echo "== timesyncd configured =="

echo "== Enabling NTP sync =="
timedatectl set-ntp true

echo "== Checking time sync status =="
timedatectl status

step_done "timesyncd"
