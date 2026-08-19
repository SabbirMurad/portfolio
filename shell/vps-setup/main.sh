#!/bin/bash
# VPS setup dispatcher.
#
# Usage:
#   ./main.sh --full                     Run every step, in order.
#   ./main.sh <target>                   Run only that one step.
#   ./main.sh <target>-onwards           Run that step and every step after it.
#   ./main.sh --list                     List all available targets.
#   ./main.sh --describe <arg>           Print the variable names needed for
#                                         --full / <target> / <target>-onwards,
#                                         without running or prompting for anything.
#
# Target names are each step file's name without the number prefix and
# without .sh -- e.g. "sshd-config", "certbot", "env-file".
#
# When run with no TTY attached (e.g. spawned by the API), this never
# blocks on a prompt: any variable it can't collect gets reported via a
# "MISSING_VARS:a,b,c" line on stderr and the run exits before touching
# the system.

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

# select_steps ARG
# Populates SELECTED_FILES and SELECTED_NAMES for --full / <target> / <target>-onwards.
# Returns 1 (with an error on stderr) if ARG doesn't match anything.
select_steps() {
    local arg="$1"
    SELECTED_FILES=()

    case "$arg" in
        --full)
            SELECTED_FILES=("${STEP_FILES[@]}")
            ;;
        *-onwards)
            local target="${arg%-onwards}"
            local found=false
            for f in "${STEP_FILES[@]}"; do
                local name
                name="$(name_for_file "$f")"
                if [[ "$name" == "$target" ]]; then
                    found=true
                fi
                if [[ "$found" == true ]]; then
                    SELECTED_FILES+=("$f")
                fi
            done
            if [[ "$found" == false ]]; then
                echo "ERROR: no step found matching target '$target'" >&2
                return 1
            fi
            ;;
        *)
            local f2
            for f2 in "${STEP_FILES[@]}"; do
                if [[ "$(name_for_file "$f2")" == "$arg" ]]; then
                    SELECTED_FILES=("$f2")
                    break
                fi
            done
            if [[ ${#SELECTED_FILES[@]} -eq 0 ]]; then
                echo "ERROR: no step found matching target '$arg'" >&2
                return 1
            fi
            ;;
    esac

    SELECTED_NAMES=()
    for f in "${SELECTED_FILES[@]}"; do
        SELECTED_NAMES+=("$(name_for_file "$f")")
    done
}

if [[ $# -eq 0 ]]; then
    echo "No argument given."
    echo "Usage: $0 --full | <target> | <target>-onwards | --list | --describe <arg>"
    exit 1
fi

if [[ "$1" == "--list" ]]; then
    list_targets
    exit 0
fi

if [[ "$1" == "--describe" ]]; then
    if [[ -z "$2" ]]; then
        echo "Usage: $0 --describe --full|<target>|<target>-onwards" >&2
        exit 1
    fi
    if ! select_steps "$2"; then
        list_targets
        exit 1
    fi
    describe_prompts_for_steps "${SELECTED_NAMES[@]}"
    exit 0
fi

if ! select_steps "$1"; then
    list_targets
    exit 1
fi

# Collect every prompt needed for the selected steps BEFORE running any
# of them, so a --full (or -onwards) run doesn't stop partway through
# waiting on input -- and so a non-interactive (API) run fails fast with
# a clear list of what's missing, before touching the system.
collect_prompts_for_steps "${SELECTED_NAMES[@]}"

# Now run the selected steps back-to-back with no further prompts.
for f in "${SELECTED_FILES[@]}"; do
    run_step "$f"
done

echo
echo "== Done =="
