#!/bin/bash
# VPS setup dispatcher.
#
# Usage:
#   ./main.sh --full                Run every step, in order.
#   ./main.sh <target>               Run only that one step.
#   ./main.sh <target>-onwards       Run that step and every step after it.
#
# Target names are each step file's name without the number prefix and
# without .sh -- e.g. "sshd-config", "certbot", "env-file".
# Run ./main.sh --list to see all available targets in order.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STEPS_DIR="$SCRIPT_DIR/steps"

# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"
# shellcheck source=prompts.sh
source "$SCRIPT_DIR/prompts.sh"

# Build an ordered list of step files (numeric prefix order)
mapfile -t STEP_FILES < <(find "$STEPS_DIR" -maxdepth 1 -name '*.sh' | sort)

# name_for_file /path/to/08-sshd-config.sh -> sshd-config
name_for_file() {
    local base
    base=$(basename "$1" .sh)
    echo "${base#*-}"
}

list_targets() {
    echo "Available targets, in run order:"
    for f in "${STEP_FILES[@]}"; do
        echo "  $(name_for_file "$f")"
    done
}

run_step() {
    local file="$1"
    echo
    echo ">>> Running: $(basename "$file")"
    bash "$file"
}

if [[ $# -eq 0 ]]; then
    echo "No argument given."
    echo "Usage: $0 --full | <target> | <target>-onwards | --list"
    exit 1
fi

arg="$1"

# Build SELECTED_FILES: the ordered list of step files this invocation
# will actually run, based on --full / <target> / <target>-onwards.
SELECTED_FILES=()

case "$arg" in
    --list)
        list_targets
        exit 0
        ;;
    --full)
        SELECTED_FILES=("${STEP_FILES[@]}")
        ;;
    *-onwards)
        target="${arg%-onwards}"
        found=false
        for f in "${STEP_FILES[@]}"; do
            name="$(name_for_file "$f")"
            if [[ "$name" == "$target" ]]; then
                found=true
            fi
            if [[ "$found" == true ]]; then
                SELECTED_FILES+=("$f")
            fi
        done
        if [[ "$found" == false ]]; then
            echo "ERROR: no step found matching target '$target'"
            list_targets
            exit 1
        fi
        ;;
    *)
        for f in "${STEP_FILES[@]}"; do
            name="$(name_for_file "$f")"
            if [[ "$name" == "$arg" ]]; then
                SELECTED_FILES=("$f")
                break
            fi
        done
        if [[ ${#SELECTED_FILES[@]} -eq 0 ]]; then
            echo "ERROR: no step found matching target '$arg'"
            list_targets
            exit 1
        fi
        ;;
esac

# Collect every prompt needed for the selected steps BEFORE running any
# of them, so a --full (or -onwards) run doesn't stop partway through
# waiting on input.
SELECTED_NAMES=()
for f in "${SELECTED_FILES[@]}"; do
    SELECTED_NAMES+=("$(name_for_file "$f")")
done
collect_prompts_for_steps "${SELECTED_NAMES[@]}"

# Now run the selected steps back-to-back with no further prompts.
for f in "${SELECTED_FILES[@]}"; do
    run_step "$f"
done

echo
echo "== Done =="
