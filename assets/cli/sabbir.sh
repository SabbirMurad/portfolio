#!/usr/bin/env bash
# sabbir — terminal client for sabbirhassan.com.
#
# The shell execution endpoints refuse the browser (see src/middleware/auth.rs),
# so this is how they're driven. `sabbir login` exchanges your account password
# for a token kept in ~/.config/sabbir/credentials with 600 permissions; every
# later call sends it as a bearer header.
#
# Worth being clear about: that token is a bearer credential. Anything holding
# it can run these commands, so treat the file the way you'd treat an ssh key.
# `sabbir logout` revokes it server-side, immediately.
#
# __API_BASE__ is substituted server-side from the host you installed from.
set -euo pipefail

API_BASE="${SABBIR_API_BASE:-__API_BASE__}"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/sabbir"
CRED_FILE="$CONFIG_DIR/credentials"

die() { printf 'error: %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl is required"

# ── credential handling ─────────────────────────────────────────────────────

load_token() {
    [ -f "$CRED_FILE" ] || die "not signed in — run: sabbir login"
    # shellcheck disable=SC1090
    . "$CRED_FILE"
    [ -n "${SABBIR_TOKEN:-}" ] || die "credentials file is unreadable — run: sabbir login"
}

save_token() {
    mkdir -p "$CONFIG_DIR"
    chmod 700 "$CONFIG_DIR"
    # The umask is set in a subshell so it does not leak into the rest of this
    # process, and it applies at creation so the file is never briefly
    # world-readable on a shared machine. chmod after is belt and braces for
    # the case where the file already existed.
    rm -f "$CRED_FILE"
    ( umask 177
      printf 'SABBIR_TOKEN=%s\nSABBIR_EXPIRES_AT=%s\n' "$1" "$2" > "$CRED_FILE" )
    chmod 600 "$CRED_FILE"
}

# ── http ────────────────────────────────────────────────────────────────────

# api METHOD PATH [BODY] — prints the response body, exits non-zero on failure
# with the server's own message.
api() {
    local method="$1" path="$2" body="${3:-}"
    local args=(-sS -X "$method" "$API_BASE$path" -H 'Accept: application/json')

    if [ -n "${SABBIR_TOKEN:-}" ]; then
        args+=(-H "Authorization: Bearer $SABBIR_TOKEN")
    fi
    if [ -n "$body" ]; then
        args+=(-H 'Content-Type: application/json' --data-binary "$body")
    fi

    local out status
    out="$(curl "${args[@]}" -w '\n%{http_code}')" || die "could not reach $API_BASE"
    status="${out##*$'\n'}"
    out="${out%$'\n'*}"

    if [ "$status" -ge 400 ]; then
        printf '%s\n' "$out" >&2
        exit 1
    fi
    printf '%s\n' "$out"
}

# Pull one string field out of a flat JSON object without needing jq.
json_field() {
    local key="$1"
    sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n 1
}

json_number() {
    local key="$1"
    sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\([0-9-]*\).*/\1/p" | head -n 1
}

# JSON-escape a string so a password with quotes or backslashes survives.
json_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# ── commands ────────────────────────────────────────────────────────────────

cmd_login() {
    local identity password label response token expires

    printf 'Email or username: '
    read -r identity
    printf 'Password: '
    read -rs password
    printf '\n'

    [ -n "$identity" ] || die "email or username is required"
    [ -n "$password" ] || die "password is required"

    label="$(hostname 2>/dev/null || echo cli)"

    response="$(api POST /api/cli/login "{\"email_or_username\":\"$(json_escape "$identity")\",\"password\":\"$(json_escape "$password")\",\"label\":\"$(json_escape "$label")\"}")"

    token="$(printf '%s' "$response" | json_field token)"
    expires="$(printf '%s' "$response" | json_number expires_at)"
    [ -n "$token" ] || die "no token in the response"

    save_token "$token" "$expires"
    printf 'Signed in. Token saved to %s\n' "$CRED_FILE"
}

cmd_logout() {
    load_token
    api POST /api/cli/logout >/dev/null
    rm -f "$CRED_FILE"
    printf 'Signed out; the token is revoked server-side.\n'
}

cmd_whoami() {
    load_token
    api GET /api/cli/whoami
}

cmd_shell() {
    local sub="${1:-}"; shift || true
    load_token

    case "$sub" in
        list)
            api GET /api/shell
            ;;
        targets)
            [ $# -ge 1 ] || die "usage: sabbir shell targets <bundle>"
            api GET "/api/shell/$1/targets"
            ;;
        describe)
            [ $# -ge 2 ] || die "usage: sabbir shell describe <bundle> <target>"
            api GET "/api/shell/$1/describe/$2"
            ;;
        run)
            [ $# -ge 2 ] || die "usage: sabbir shell run <bundle> <target> [KEY=VALUE ...]"
            local bundle="$1" target="$2"; shift 2
            local vars="" pair key value
            for pair in "$@"; do
                case "$pair" in
                    *=*) ;;
                    *) die "variables must be KEY=VALUE, got: $pair" ;;
                esac
                key="${pair%%=*}"
                value="${pair#*=}"
                [ -n "$vars" ] && vars="$vars,"
                vars="$vars\"$(json_escape "$key")\":\"$(json_escape "$value")\""
            done
            api POST "/api/shell/$bundle/run/$target" "{\"vars\":{$vars}}"
            ;;
        job)
            [ $# -ge 2 ] || die "usage: sabbir shell job <bundle> <job-id>"
            api GET "/api/shell/$1/jobs/$2"
            ;;
        logs)
            [ $# -ge 2 ] || die "usage: sabbir shell logs <bundle> <job-id>"
            api GET "/api/shell/$1/jobs/$2/logs"
            ;;
        *)
            die "unknown subcommand: ${sub:-<none>} (try: sabbir help)"
            ;;
    esac
}

cmd_upgrade() {
    curl -fsSL "$API_BASE/install.sh" | bash
}

cmd_help() {
    cat <<'USAGE'
sabbir — terminal client for sabbirhassan.com

  sabbir login                                 sign in, save a token
  sabbir logout                                revoke it and forget it
  sabbir whoami                                who the saved token belongs to

  sabbir shell list                            installed script bundles
  sabbir shell targets <bundle>                its steps, in run order
  sabbir shell describe <bundle> <target>      variables that target needs
  sabbir shell run <bundle> <target> [K=V ...] start it; prints a job id
  sabbir shell job <bundle> <job-id>           status of a run
  sabbir shell logs <bundle> <job-id>          its output

  sabbir upgrade                               reinstall the latest client
  sabbir help                                  this

The shell commands run scripts as root on the server's own host. `run` starts
immediately, with no confirmation.
USAGE
}

case "${1:-help}" in
    login)   shift; cmd_login "$@" ;;
    logout)  shift; cmd_logout "$@" ;;
    whoami)  shift; cmd_whoami "$@" ;;
    shell)   shift; cmd_shell "$@" ;;
    upgrade) shift; cmd_upgrade "$@" ;;
    help|-h|--help) cmd_help ;;
    *) printf 'unknown command: %s\n\n' "$1" >&2; cmd_help >&2; exit 1 ;;
esac
