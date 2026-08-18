#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "sshd-config"

prompt_if_unset new_username "Enter username to allow SSH access for: "

SSHD_CONFIG="/etc/ssh/sshd_config"
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak"

NEW_BLOCK=$(cat << BLOCKEOF
# This is the sshd server system-wide configuration file.  See
# sshd_config(5) for more information.
# This sshd_config was a successor of systems sshd_config.default
# The strategy used for options in the default sshd_config shipped with
# OpenSSH is to specify options with their default value where
# possible, but leave them commented.  Uncommented options change a
# default value.
# Login Banner
Banner /etc/issue.net
PrintMotd yes
# Allow Access
AllowUsers $new_username
# Listening Ports, IPs and protocols
Port 22
# Use these options to restrict which interfaces/protocols sshd will bind to
#ListenAddress ::
#ListenAddress 0.0.0.0
AddressFamily inet
Protocol 2
# HostKeys for protocol version 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
# Logging
PrintLastLog yes
SyslogFacility AUTH
LogLevel INFO
# Authentication:
LoginGraceTime 120
MaxAuthTries 5
MaxSessions 5
PermitRootLogin no
StrictModes yes
# TCP connection
TCPKeepAlive yes
ClientAliveInterval 15
ClientAliveCountMax 55
# Don't read the user's ~/.rhosts and ~/.shosts files
IgnoreRhosts yes
# similar for protocol version 2
HostbasedAuthentication no
# Uncomment if you don't trust ~/.ssh/known_hosts for RhostsRSAAuthentication
IgnoreUserKnownHosts yes
# To enable empty passwords, change to yes (NOT RECOMMENDED)
PermitEmptyPasswords no
# Change to yes to enable challenge-response passwords (beware issues with
# some PAM modules and threads)
ChallengeResponseAuthentication yes
UsePAM yes
# Change to no to disable tunnelled clear text passwords
PasswordAuthentication no
# override default of no subsystems
#Subsystem	sftp	/usr/lib/misc/sftp-server
Subsystem	sftp	internal-sftp
BLOCKEOF
)

# For each real directive line (skip blanks/comments) in the new block,
# strip out any existing occurrence of that directive from the file,
# commented or not, so we don't end up with duplicate/conflicting entries.
while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^# ]] && continue
    keyword=$(echo "$line" | awk '{print $1}')
    sed -i -E "/^#?[[:space:]]*${keyword}[[:space:]]/Id" "$SSHD_CONFIG"
done <<< "$NEW_BLOCK"

# Append the new block
echo "" >> "$SSHD_CONFIG"
echo "$NEW_BLOCK" >> "$SSHD_CONFIG"

# Validate syntax BEFORE restarting -- refuse to restart on a broken config
if sshd -t; then
    echo "sshd_config syntax OK, restarting sshd"
    systemctl restart sshd
else
    echo "ERROR: sshd_config syntax error -- restoring backup, NOT restarting sshd"
    cp "${SSHD_CONFIG}.bak" "$SSHD_CONFIG"
    exit 1
fi

echo "== sshd_config updated =="

step_done "sshd-config"
