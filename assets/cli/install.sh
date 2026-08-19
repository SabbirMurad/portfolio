#!/usr/bin/env bash
# Installer for the `sabbir` CLI.
#
#   curl -fsSL __API_BASE__/install.sh | bash
#
# Downloads the client to ~/.local/bin/sabbir and makes it executable. Nothing
# runs as root, nothing is written outside your home directory, and no
# credential is involved — signing in is a separate, explicit step afterwards.
#
# __API_BASE__ is substituted server-side (src/handler/cli/script.rs) from the
# host this was fetched from, so the installed client talks back to wherever
# you got it.
set -euo pipefail

API_BASE="__API_BASE__"
BIN_DIR="${SABBIR_BIN_DIR:-$HOME/.local/bin}"
BIN_PATH="$BIN_DIR/sabbir"

say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl is required"

say "Installing the sabbir CLI from $API_BASE"

mkdir -p "$BIN_DIR"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

if ! curl -fsSL "$API_BASE/cli.sh" -o "$tmp"; then
    die "could not download $API_BASE/cli.sh"
fi

# A truncated download would otherwise land as a broken executable.
head -n 1 "$tmp" | grep -q '^#!/usr/bin/env bash' \
    || die "downloaded file does not look like the client; refusing to install"

mv "$tmp" "$BIN_PATH"
trap - EXIT
chmod 755 "$BIN_PATH"

say ""
say "Installed to $BIN_PATH"

case ":$PATH:" in
    *":$BIN_DIR:"*)
        say ""
        say "Next:  sabbir login"
        ;;
    *)
        say ""
        say "$BIN_DIR is not on your PATH. Add it:"
        say ""
        say "    echo 'export PATH=\"\$PATH:$BIN_DIR\"' >> ~/.bashrc"
        say "    exec \$SHELL"
        say ""
        say "Then:  sabbir login"
        ;;
esac
