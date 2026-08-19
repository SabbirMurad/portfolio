// API wrapper around vps-setup's main.sh.
//
// Routes are all under /shell/vps-setup:
//
//   GET  /shell/vps-setup/targets
//       -> { targets: ["system-update", "remove-cryptsetup", ...] }
//
//   GET  /shell/vps-setup/describe/full
//   GET  /shell/vps-setup/describe/target/:name
//   GET  /shell/vps-setup/describe/onwards/:name
//       -> { vars: ["dir_name", "domain_name", ...] }
//       Tells you what fields to send in the POST body below, without
//       running or changing anything.
//
//   POST /shell/vps-setup/full        { vars: { key: value, ... } }
//   POST /shell/vps-setup/target/:name    { vars: { ... } }
//   POST /shell/vps-setup/onwards/:name   { vars: { ... } }
//       -> 202 { job_id }
//       Writes the given vars into the shared vars file, then starts
//       main.sh in the background. Poll the job endpoints below for status.
//
//   GET  /shell/vps-setup/jobs/:id
//       -> { id, target, status, started_at, finished_at, exit_code, missing_vars? }
//       status is one of: running | success | failed | failed_missing_vars
//
//   GET  /shell/vps-setup/jobs/:id/logs
//       -> text/plain, full combined stdout/stderr log for that job
//
// IMPORTANT: every route under here can install packages, create system
// users, rewrite sshd_config, and run arbitrary root shell scripts on this
// machine. This must NOT be exposed to the public internet without auth in
// front of it. See the API_KEY handling below and the README.

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const VPS_SETUP_DIR = path.resolve(__dirname, '..');
const MAIN_SCRIPT = path.join(VPS_SETUP_DIR, 'main.sh');
const VARS_FILE = '/etc/vps-setup/vars.env';
const LOG_DIR = path.join(VPS_SETUP_DIR, 'api', 'logs');

fs.mkdirSync(path.dirname(VARS_FILE), { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

// ---- optional API key gate --------------------------------------------
// Set VPS_SETUP_API_KEY in the environment to require an `x-api-key`
// header on every request. Strongly recommended -- see README.
const API_KEY = process.env.VPS_SETUP_API_KEY;
if (!API_KEY) {
    console.warn(
        'WARNING: VPS_SETUP_API_KEY is not set. This API is unauthenticated ' +
        'and can run arbitrary root setup steps on this machine. ' +
        'Set VPS_SETUP_API_KEY and put this behind a firewall/reverse proxy.'
    );
}

function requireApiKey(req, res, next) {
    if (!API_KEY) return next(); // no key configured -- open (dev only!)
    if (req.get('x-api-key') === API_KEY) return next();
    return res.status(401).json({ error: 'missing or invalid x-api-key header' });
}

// ---- shared vars file helpers ------------------------------------------

// Writes/overwrites KEY="value" lines in the shared vars file, the same
// file common.sh's save_var writes to. Existing keys are replaced.
function writeVars(vars) {
    let lines = [];
    if (fs.existsSync(VARS_FILE)) {
        lines = fs.readFileSync(VARS_FILE, 'utf8').split('\n').filter(Boolean);
    }
    for (const [key, value] of Object.entries(vars || {})) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            throw new Error(`invalid variable name: ${key}`);
        }
        lines = lines.filter((line) => !line.startsWith(`${key}=`));
        const escaped = String(value).replace(/"/g, '\\"');
        lines.push(`${key}="${escaped}"`);
    }
    fs.writeFileSync(VARS_FILE, lines.join('\n') + '\n');
}

// ---- job tracking (in-memory; lost on server restart) ------------------

const jobs = new Map();

function startJob(target, vars) {
    if (vars && Object.keys(vars).length > 0) {
        writeVars(vars);
    }

    const id = crypto.randomUUID();
    const logPath = path.join(LOG_DIR, `${id}.log`);
    const logFd = fs.openSync(logPath, 'a');

    const job = {
        id,
        target,
        status: 'running',
        started_at: new Date().toISOString(),
        finished_at: null,
        exit_code: null,
        missing_vars: null,
        log_path: logPath,
    };
    jobs.set(id, job);

    const child = spawn('bash', [MAIN_SCRIPT, target], {
        cwd: VPS_SETUP_DIR,
        stdio: ['ignore', logFd, logFd], // no stdin -- guarantees non-interactive mode
    });

    child.on('exit', (code) => {
        fs.closeSync(logFd);
        job.exit_code = code;
        job.finished_at = new Date().toISOString();

        if (code === 0) {
            job.status = 'success';
        } else {
            const logContent = fs.readFileSync(logPath, 'utf8');
            const match = logContent.match(/MISSING_VARS:([^\n]+)/);
            if (match) {
                job.status = 'failed_missing_vars';
                job.missing_vars = match[1].split(',');
            } else {
                job.status = 'failed';
            }
        }
    });

    child.on('error', (err) => {
        fs.closeSync(logFd);
        job.status = 'failed';
        job.exit_code = null;
        job.finished_at = new Date().toISOString();
        fs.appendFileSync(logPath, `\nFailed to spawn: ${err.message}\n`);
    });

    return job;
}

function runSync(args) {
    // Small helper for the read-only describe/list routes -- these don't
    // touch the system, so running them synchronously and capturing
    // output is simpler than the job machinery above.
    return new Promise((resolve, reject) => {
        const child = spawn('bash', [MAIN_SCRIPT, ...args], {
            cwd: VPS_SETUP_DIR,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => (stdout += d));
        child.stderr.on('data', (d) => (stderr += d));
        child.on('exit', (code) => {
            if (code !== 0) return reject(new Error(stderr || `exited with code ${code}`));
            resolve(stdout);
        });
        child.on('error', reject);
    });
}

// ---- routes --------------------------------------------------------------

const router = express.Router();
router.use(requireApiKey);

router.get('/targets', async (req, res) => {
    try {
        const out = await runSync(['--list']);
        const targets = out
            .split('\n')
            .slice(1) // drop the "Available targets, in run order:" header
            .map((l) => l.trim())
            .filter(Boolean);
        res.json({ targets });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function describeHandler(arg, res) {
    try {
        const out = await runSync(['--describe', arg]);
        const vars = out.split('\n').map((l) => l.trim()).filter(Boolean);
        res.json({ vars });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

router.get('/describe/full', (req, res) => describeHandler('--full', res));
router.get('/describe/target/:name', (req, res) => describeHandler(req.params.name, res));
router.get('/describe/onwards/:name', (req, res) =>
    describeHandler(`${req.params.name}-onwards`, res)
);

function startJobHandler(target) {
    return (req, res) => {
        try {
            const job = startJob(target, req.body && req.body.vars);
            res.status(202).json({ job_id: job.id, target: job.target, status: job.status });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    };
}

router.post('/full', startJobHandler('--full'));
router.post('/target/:name', (req, res) => startJobHandler(req.params.name)(req, res));
router.post('/onwards/:name', (req, res) =>
    startJobHandler(`${req.params.name}-onwards`)(req, res)
);

router.get('/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'no such job' });
    const { log_path, ...rest } = job;
    res.json(rest);
});

router.get('/jobs/:id/logs', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'no such job' });
    res.type('text/plain').send(fs.existsSync(job.log_path) ? fs.readFileSync(job.log_path, 'utf8') : '');
});

app.use('/shell/vps-setup', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`vps-setup API listening on port ${PORT}`);
    console.log(`Routes mounted at /shell/vps-setup`);
});
