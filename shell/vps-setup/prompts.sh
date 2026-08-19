#!/bin/bash
# Central manifest of which variables each step needs, and how to prompt
# for them. Used ONLY for the upfront "collection phase" in main.sh, so
# every prompt happens before any step actually starts running.
#
# Not sourced by the individual step scripts -- they still call
# prompt_if_unset themselves as a safety net (e.g. if a step is somehow
# invoked without going through main.sh), but since collection already
# filled in the vars file, that fallback won't actually prompt again.

# print_prompts_for STEP_NAME
# Prints lines of: var_name|prompt text|silent_flag(-s or empty)
# for simple (non-conditional) variables. Conditional / multi-step
# prompts (password confirmation, optional auth) are handled directly
# in collect_prompts_for_steps() below.
print_prompts_for() {
    case "$1" in
        create-user)
            echo "new_username|Enter new username: |"
            ;;
        sshd-config)
            echo "new_username|Enter username to allow SSH access for: |"
            ;;
        git-config)
            echo "git_name|Enter your full name for git: |"
            echo "git_email|Enter your email address for git: |"
            ;;
        certbot)
            echo "domain_name|Enter your domain name (without www or https://, e.g. example.com): |"
            ;;
        cert-chain)
            echo "domain_name|Enter your domain name (e.g. example.com): |"
            ;;
        systemd-webserver)
            echo "service_name|Enter service name: |"
            echo "dir_name|Enter directory name (under /www/): |"
            echo "http_port|Enter HTTP port: |"
            echo "https_port|Enter HTTPS port: |"
            ;;
        clone-repo)
            echo "dir_name|Enter directory name (under /www/): |"
            echo "github_url|Enter GitHub repository URL (e.g. https://github.com/user/repo.git): |"
            ;;
        env-file)
            echo "dir_name|Enter directory name (under /www/): |"
            echo "http_port|Enter HTTP port: |"
            echo "https_port|Enter HTTPS port: |"
            echo "domain_name|Enter your domain name (e.g. example.com): |"
            echo "smtp_email|Enter SMTP email: |"
            echo "smtp_password|Enter SMTP password: |-s"
            echo "smtp_project_name|Enter SMTP project name: |"
            ;;
        deploy-binary)
            echo "dir_name|Enter directory name (under /www/): |"
            echo "service_name|Enter service name: |"
            echo "drive_url|Enter Google Drive link to the exe file: |"
            ;;
        *)
            # Steps with no interactive prompts (system-update, ufw, rust, etc.)
            ;;
    esac
}

# collect_prompts_for_steps NAME [NAME ...]
# Runs the upfront collection pass for exactly the set of steps that are
# about to be executed. Skips any variable already known from a previous
# run (loaded from the shared vars file by common.sh). Safe to call with
# no TTY attached (e.g. from the API) -- see require_no_missing_vars.
collect_prompts_for_steps() {
    echo "== Gathering required info before starting =="
    echo

    for step_name in "$@"; do
        # Simple var|prompt|silent entries
        while IFS='|' read -r var_name prompt_text silent; do
            [[ -z "$var_name" ]] && continue
            prompt_if_unset "$var_name" "$prompt_text" "$silent"
        done < <(print_prompts_for "$step_name")

        # Special-cased steps with conditional or multi-part prompts
        case "$step_name" in
            create-user)
                if [[ -z "$new_password" ]]; then
                    if [[ -t 0 ]]; then
                        read -s -p "Enter password for ${new_username:-the new user}: " new_password
                        echo
                        read -s -p "Confirm password: " new_password_confirm
                        echo
                        if [[ "$new_password" != "$new_password_confirm" ]]; then
                            echo "ERROR: Passwords do not match. Exiting."
                            exit 1
                        fi
                        save_var new_password "$new_password"
                    else
                        MISSING_VARS+=("new_password")
                    fi
                fi
                ;;
            clone-repo)
                prompt_if_unset needs_auth "Does this repository require authentication? (y/n): "
                if [[ "$needs_auth" =~ ^[Yy]$ ]]; then
                    prompt_if_unset github_username "Enter GitHub username: "
                    prompt_if_unset github_token "Enter GitHub personal access token: " -s
                fi
                ;;
        esac
    done

    require_no_missing_vars

    echo
    echo "== All required info collected, starting run =="
    echo
}

# describe_prompts_for_steps NAME [NAME ...]
# Prints the full set of variable names that COULD be required for the
# given steps, one per line, without prompting or executing anything.
# Used by the API to tell a caller what fields to send.
describe_prompts_for_steps() {
    for step_name in "$@"; do
        while IFS='|' read -r var_name prompt_text silent; do
            [[ -z "$var_name" ]] && continue
            echo "$var_name"
        done < <(print_prompts_for "$step_name")

        case "$step_name" in
            create-user)
                echo "new_password"
                ;;
            clone-repo)
                echo "needs_auth"
                echo "github_username (required only if needs_auth=y)"
                echo "github_token (required only if needs_auth=y)"
                ;;
        esac
    done | awk '!seen[$0]++'
}
