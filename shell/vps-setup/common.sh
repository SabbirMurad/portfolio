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

# prompt_if_unset VAR_NAME "Prompt text" [-s for silent/password input]
# Only asks if the variable isn't already known from a previous step/run.
prompt_if_unset() {
    local var_name="$1"
    local prompt_text="$2"
    local silent="$3"
    local current_value="${!var_name}"

    if [[ -n "$current_value" ]]; then
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

step_start() {
    echo "############################################"
    echo "== Starting step: $1 =="
    echo "############################################"
}

step_done() {
    echo "== Step complete: $1 =="
    echo
}
