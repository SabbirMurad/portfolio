#!/bin/bash
# Shared helpers sourced by every step script.
# Not meant to be run directly.

set -e
export DEBIAN_FRONTEND=noninteractive

VARS_FILE="/etc/vps-setup/vars.env"
mkdir -p "$(dirname "$VARS_FILE")"
touch "$VARS_FILE"

# Load any variables collected by previous steps (works across separate runs)
# shellcheck disable=SC1090
source "$VARS_FILE"

# save_var NAME VALUE
# Persists a variable to the shared vars file (replacing any prior value)
# so later steps -- even run in a separate invocation -- can reuse it.
save_var() {
    local name="$1"
    local value="$2"
    sed -i "/^${name}=/d" "$VARS_FILE" 2>/dev/null || true
    echo "${name}=\"${value}\"" >> "$VARS_FILE"
}

# Populated when running non-interactively (e.g. invoked via the API) and
# a required value wasn't already provided. Checked by require_no_missing_vars.
declare -a MISSING_VARS=()

# prompt_if_unset VAR_NAME "Prompt text" [-s for silent/password input]
# Only asks if the variable isn't already known from a previous step/run.
# If there's no TTY attached (e.g. invoked over the API), it never blocks
# on read -- it records the variable as missing instead, so the caller
# gets a clear, complete list rather than a hang or a silently-empty value.
prompt_if_unset() {
    local var_name="$1"
    local prompt_text="$2"
    local silent="$3"
    local current_value="${!var_name}"

    if [[ -n "$current_value" ]]; then
        return
    fi

    if [[ ! -t 0 ]]; then
        MISSING_VARS+=("$var_name")
        return
    fi

    local input_value
    if [[ "$silent" == "-s" ]]; then
        read -s -p "$prompt_text" input_value
        echo
    else
        read -p "$prompt_text" input_value
    fi

    printf -v "$var_name" '%s' "$input_value"
    save_var "$var_name" "$input_value"
}

# Call after all prompt_if_unset calls for a run. Exits with a parseable
# "MISSING_VARS:a,b,c" line on stderr if anything couldn't be collected
# non-interactively, so an API wrapper can report exactly what's needed.
require_no_missing_vars() {
    if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
        local joined
        joined=$(IFS=,; echo "${MISSING_VARS[*]}")
        echo "MISSING_VARS:${joined}" >&2
        echo "ERROR: missing required values for non-interactive run: ${joined}" >&2
        exit 1
    fi
}

step_start() {
    echo "############################################"
    echo "== Starting step: $1 =="
    echo "############################################"
}

step_done() {
    echo "== Step complete: $1 =="
    echo
}
