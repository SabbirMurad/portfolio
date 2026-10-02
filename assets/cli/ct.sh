#!/usr/bin/env bash
# ct — terminal client for sabbirhassan.com.
#
# `ct login` exchanges your account password for a token kept in
# ~/.config/ct/credentials with 600 permissions; every later call sends it as
# a bearer header.
#
# `ct shell run` downloads the named bundle (a zip of shell scripts the
# server only ever stores and hands out, see handler/shell.rs) and runs its
# main.sh right here, in this terminal, on this machine — not on
# sabbirhassan.com. That's the point of a bundle like vps-setup: it
# provisions whatever box you run `ct` on, which is never the server
# distributing it. The download requires a valid token on every single run —
# there is no local cache of the bundle between invocations — so `ct logout`
# or a blocked account loses the ability to run it immediately, on a new
# machine or one it already ran on.
#
# Worth being clear about: that token is a bearer credential. Anything holding
# it can download and run these bundles, so treat the file the way you'd
# treat an ssh key. `ct logout` revokes it server-side, immediately.
#
# __API_BASE__ is substituted server-side from the host you installed from.
set -euo pipefail

API_BASE="${CT_API_BASE:-__API_BASE__}"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/ct"
CRED_FILE="$CONFIG_DIR/credentials"

die() { printf 'error: %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl is required"

# ── credential handling ─────────────────────────────────────────────────────

load_token() {
    [ -f "$CRED_FILE" ] || die "not signed in — run: ct login"
    # shellcheck disable=SC1090
    . "$CRED_FILE"
    [ -n "${CT_TOKEN:-}" ] || die "credentials file is unreadable — run: ct login"
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
      printf 'CT_TOKEN=%s\nCT_EXPIRES_AT=%s\n' "$1" "$2" > "$CRED_FILE" )
    chmod 600 "$CRED_FILE"
}

# ── http ────────────────────────────────────────────────────────────────────

# api METHOD PATH [BODY] — prints the response body, exits non-zero on failure
# with the server's own message.
api() {
    local method="$1" path="$2" body="${3:-}"
    local args=(-sS -X "$method" "$API_BASE$path" -H 'Accept: application/json')

    if [ -n "${CT_TOKEN:-}" ]; then
        args+=(-H "Authorization: Bearer $CT_TOKEN")
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

# Downloads <bundle> fresh (every call — nothing is cached locally) and runs
# its main.sh <target> right here, in this terminal: stdin/stdout/stderr are
# this shell's own, so main.sh's interactive prompts for anything not passed
# as KEY=VALUE just work, the same as running it after copying the files over
# by hand. Cleans up the extracted copy on exit either way.
run_bundle() {
    local bundle="$1" target="$2"; shift 2

    # Not `local`: the EXIT trap below runs in the shell's global scope, not
    # this function's, so a local tmpdir would already be unbound — and
    # therefore an error under `set -u` — by the time cleanup runs.
    tmpdir="$(mktemp -d)" || die "could not create a temporary directory"
    trap 'rm -rf "$tmpdir"' EXIT

    printf 'Downloading %s...\n' "$bundle" >&2
    local zipfile="$tmpdir/bundle.zip" status
    status="$(curl -sS -o "$zipfile" -w '%{http_code}' \
        -H "Authorization: Bearer $CT_TOKEN" \
        "$API_BASE/api/shell/$bundle/download")" \
        || die "could not reach $API_BASE"

    if [ "$status" -ge 400 ]; then
        cat "$zipfile" >&2
        exit 1
    fi

    if ! command -v unzip >/dev/null 2>&1; then
        printf 'unzip not found — installing it...\n' >&2
        apt-get update -qq && apt-get install -y -qq unzip
    fi

    local bundle_dir="$tmpdir/bundle"
    mkdir -p "$bundle_dir"
    unzip -q "$zipfile" -d "$bundle_dir" || die "could not unpack the downloaded bundle"
    [ -f "$bundle_dir/main.sh" ] || die "downloaded bundle has no main.sh"

    # Anything passed as KEY=VALUE is exported before main.sh runs, so its own
    # prompt_if_unset (common.sh) sees it as already set and skips asking —
    # whatever's left unset, main.sh prompts for right here, interactively.
    local pair key value
    for pair in "$@"; do
        case "$pair" in
            *=*) ;;
            *) die "variables must be KEY=VALUE, got: $pair" ;;
        esac
        key="${pair%%=*}"
        value="${pair#*=}"
        export "$key=$value"
    done

    bash "$bundle_dir/main.sh" "$target"
}

cmd_shell() {
    local sub="${1:-}"; shift || true
    load_token

    case "$sub" in
        list)
            api GET /api/shell
            ;;
        targets)
            [ $# -ge 1 ] || die "usage: ct shell targets <bundle>"
            api GET "/api/shell/$1/targets"
            ;;
        describe)
            [ $# -ge 2 ] || die "usage: ct shell describe <bundle> <target>"
            api GET "/api/shell/$1/describe/$2"
            ;;
        run)
            [ $# -ge 2 ] || die "usage: ct shell run <bundle> <target> [KEY=VALUE ...]"
            local bundle="$1" target="$2"; shift 2
            run_bundle "$bundle" "$target" "$@"
            ;;
        *)
            die "unknown subcommand: ${sub:-<none>} (try: ct help)"
            ;;
    esac
}

cmd_upgrade() {
    curl -fsSL "$API_BASE/install.sh" | bash
}

cmd_help() {
    cat <<'USAGE'
ct — terminal client for sabbirhassan.com

  ct login                                 sign in, save a token
  ct logout                                revoke it and forget it
  ct whoami                                who the saved token belongs to

  ct shell list                            installed script bundles
  ct shell targets <bundle>                its steps, in run order
  ct shell describe <bundle> <target>      variables that target needs
  ct shell run <bundle> <target> [K=V ...] download it and run it, right here

  ct upgrade                               reinstall the latest client
  ct help                                  this

`ct shell run` downloads the bundle fresh every time and runs it on THIS
machine, in this terminal — not on sabbirhassan.com. It starts immediately,
with no confirmation, typically as root, so know what a bundle's scripts do
before running it. Anything not passed as KEY=VALUE is prompted for
interactively, same as running the scripts by hand.
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
