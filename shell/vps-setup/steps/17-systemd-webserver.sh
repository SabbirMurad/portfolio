#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "systemd-webserver"

prompt_if_unset service_name "Enter service name: "
prompt_if_unset dir_name "Enter directory name (under /www/): "
prompt_if_unset http_port "Enter HTTP port: "
prompt_if_unset https_port "Enter HTTPS port: "

SERVICE_FILE="/etc/systemd/system/${service_name}.service"
SOCKET_FILE="/etc/systemd/system/${service_name}.socket"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=${service_name} Web Server.
Documentation=https://actix.rs/
After=syslog.target network.target remote-fs.target nss-lookup.target ${service_name}.socket
Requires=${service_name}.socket
[Service]
User=root
Type=simple
LimitNOFILE=65536
WorkingDirectory=/www/${dir_name}
ExecStartPre=/root/.cargo/bin/cargo --version
ExecStart=/www/${dir_name}/${dir_name}
ExecStop=/bin/kill -s SIGTERM \$MAINPID
OOMScoreAdjust=1000
MemoryAccounting=true
MemoryHigh=3G
MemoryMax=4G
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOF

cat > "$SOCKET_FILE" << EOF
[Unit]
Description=${service_name} Web Server Socket
PartOf=${service_name}.service
[Socket]
ListenStream=0.0.0.0:${http_port}
ListenStream=0.0.0.0:${https_port}
KeepAlive=true
[Install]
WantedBy=sockets.target
EOF

echo "== ${service_name}.service and ${service_name}.socket created =="

echo "== Setting permissions on service and socket files =="
chmod 755 "$SERVICE_FILE"
chmod 755 "$SOCKET_FILE"
echo "== Permissions set =="

step_done "systemd-webserver"
