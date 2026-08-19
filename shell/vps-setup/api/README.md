# vps-setup API

An HTTP wrapper around the `main.sh` step scripts, so you can trigger VPS
setup steps from an API instead of an interactive terminal.

## ⚠️ Security first

Every route under `/shell/vps-setup` can install packages, create system
users, rewrite `sshd_config`, and run arbitrary root shell scripts on this
machine. **Do not expose this to the public internet without protection.**

- Set `VPS_SETUP_API_KEY` before starting the server. Every request then
  needs a matching `x-api-key` header, or it gets a 401.
- If `VPS_SETUP_API_KEY` isn't set, the server starts anyway (for local
  dev) but prints a loud warning on startup — treat that as "not safe to
  expose."
- Even with a key, bind this to `127.0.0.1` and put a real reverse proxy /
  firewall in front of it for anything beyond your own box.

## Running it

```bash
cd api
npm install
VPS_SETUP_API_KEY=your-long-random-key node server.js
# or: PORT=8080 VPS_SETUP_API_KEY=... node server.js
```

## Routes

All routes are mounted under `/shell/vps-setup`. Send `x-api-key: <key>`
on every request if `VPS_SETUP_API_KEY` is set.

### `GET /shell/vps-setup/targets`
List every available step name, in run order.

### `GET /shell/vps-setup/describe/full`
### `GET /shell/vps-setup/describe/target/:name`
### `GET /shell/vps-setup/describe/onwards/:name`
Returns the variable names a run will need, without running or changing
anything — use this to build a form / know what to send in the POST body.

```
GET /shell/vps-setup/describe/target/env-file
-> { "vars": ["dir_name","http_port","https_port","domain_name",
              "smtp_email","smtp_password","smtp_project_name"] }
```

### `POST /shell/vps-setup/full`
### `POST /shell/vps-setup/target/:name`
### `POST /shell/vps-setup/onwards/:name`

Body: `{ "vars": { "key": "value", ... } }`

Starts the run as a background job and returns immediately:

```
202 { "job_id": "...", "target": "git-config", "status": "running" }
```

Any variable already known from a previous run (stored server-side in
`/etc/vps-setup/vars.env`) doesn't need to be sent again. If something
required is still missing, the job fails fast — before touching the
system — with `status: "failed_missing_vars"` and a `missing_vars` array
telling you exactly what to send. Just POST again with those fields
added; everything else already collected is reused automatically.

### `GET /shell/vps-setup/jobs/:id`
Job status: `running | success | failed | failed_missing_vars`, plus
`exit_code`, timestamps, and `missing_vars` when relevant.

### `GET /shell/vps-setup/jobs/:id/logs`
Plain-text combined stdout/stderr for that job. Poll this while a job is
`running` to watch it progress.

## Example: running the whole setup end to end

```bash
KEY=your-long-random-key

curl -X POST http://localhost:3000/shell/vps-setup/full \
  -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{
    "vars": {
      "new_username": "deploy",
      "git_name": "Deploy Bot",
      "git_email": "deploy@example.com",
      "domain_name": "example.com",
      "service_name": "myapp",
      "dir_name": "myapp",
      "http_port": "8080",
      "https_port": "8443",
      "github_url": "https://github.com/you/myapp.git",
      "needs_auth": "n",
      "smtp_email": "noreply@example.com",
      "smtp_project_name": "myapp",
      "drive_url": "https://drive.google.com/uc?id=..."
    }
  }'
# -> { "job_id": "...", "target": "--full", "status": "running" }

# poll:
curl -H "x-api-key: $KEY" http://localhost:3000/shell/vps-setup/jobs/<job_id>
curl -H "x-api-key: $KEY" http://localhost:3000/shell/vps-setup/jobs/<job_id>/logs
```

Note: `new_password` and `smtp_password` are still required for `--full`
but were left out of the example above on purpose — send those over a
secure connection only.

## Notes / limitations

- Job state is kept in memory. If the API process restarts, in-flight job
  status is lost (the underlying shell steps that already ran are
  unaffected — the shared vars file at `/etc/vps-setup/vars.env` persists
  across restarts, so a re-POST will skip anything already collected).
- Each job's log is written to `api/logs/<job_id>.log` and kept
  indefinitely — clean these up periodically if disk space matters.
- This process needs to run as root (or with sudo) since the underlying
  steps do (`apt`, `useradd`, editing `/etc/ssh/sshd_config`, etc.).
