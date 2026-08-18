#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/common.sh"

step_start "rust"

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Load cargo into the current shell session so later steps can use it
source "$HOME/.cargo/env"

echo "== Rust installed =="
rustc --version
cargo --version

step_done "rust"
