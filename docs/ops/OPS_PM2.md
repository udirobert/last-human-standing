# PM2 Operations Guide

**Production target:** `ssh snel-bot` (deploy user, port `49152`), serving
`lasthumanstanding.thisyearnofear.com` from `/opt/last-human-standing`. The
`nuncio-vultr` SSH host is a separate machine and is not the production target.

## Standard Release Workflow

From the repository root, verify the linked Supabase project and apply any
pending migrations before changing the application release:

```bash
supabase migration list --linked
supabase db push --linked
bash scripts/preflight.sh
bash scripts/package-release.sh
```

The release script performs a clean local build, packages an allowlisted
source-free artifact, uploads the release-specific `deploy.sh`, and removes
its temporary tarball and generated build output. Production runtime secrets
remain in `/opt/last-human-standing/shared/.env`; keep that file mode `600`.

## Incident Postmortem: 2026-04-03 Crash Loop (9 GB Disk Fill)

### Timeline

- **2026-04-03** (or earlier): Someone ran `sudo pm2 start server/index.js` from
  `/opt/last-human-standing` instead of using the ecosystem config. This registered
  the process under root with `cwd=/opt/last-human-standing` (missing `/current`).
- **2026-04-03 onward**: The process could not resolve `node_modules` from the wrong
  cwd (the symlink `node_modules -> /opt/last-human-standing/shared/node_modules`
  only exists inside `/current`). Every startup threw `MODULE_NOT_FOUND` and exited.
- PM2's `max_restarts: 10` from `ecosystem.config.cjs` was **never applied** because
  the process wasn't started from that file. PM2's default is unlimited restarts.
- **8,674,882 restarts** occurred, each writing a stack trace to the error log.
- Result: **6.7 GB error log + 2.2 GB pm2.log = ~8.9 GB** of wasted disk, pushing
  the 38 GB disk to 95%+ usage.

### Root Causes

1. **Manual `pm2 start` instead of ecosystem config** — lost all safety settings
   (cwd, max_restarts, node_args, memory limit).
2. **Running as root** — the process couldn't read the deploy user's symlinks and
   env correctly, and root's pm2 daemon has no log rotation.
3. **No log rotation configured** — neither `pm2-logrotate` module nor system
   `logrotate.d` entry existed for pm2 logs.
4. **`pm2-deploy.service` was dead** — the systemd unit pointed to a deleted
   binary path (`/home/deploy/.pm2/modules/pm2-logrotate/node_modules/pm2/bin/pm2`),
   so only the root pm2 daemon was running.

### Resolution (2026-08-08)

1. Deleted the broken root pm2 process.
2. Restarted correctly via `pm2 start ecosystem.config.cjs` under the `deploy` user.
3. Fixed `/usr/local/bin/pm2` symlink (pointed to deleted logrotate module path).
4. Fixed `pm2-deploy.service` ExecStart/ExecReload/ExecStop paths.
5. Killed and re-launched pm2 daemon under systemd (`pm2-deploy.service` now active).
6. Disabled `pm2-root.service` (no processes need root pm2).
7. Added `/etc/logrotate.d/pm2-deploy` (daily, 7 rotations, 100 MB max, copytruncate).
8. Added `/etc/logrotate.d/pm2-root` (safety net, 50 MB max).
9. Added preflight + deploy script checks to catch recurrence.

### Production Recovery (2026-08-14)

The first post-hardening deploy found a second failure mode: a standalone root
Node process was holding the configured application port (`5300`) outside PM2.
The managed `deploy` PM2 process was online but could not bind the port, so nginx
served static files while API requests timed out. After confirming the process
command, owner, port, and lack of a managed PM2 entry, it was stopped gracefully
with `SIGTERM`; the managed process was restarted and `/api/health` returned
`200` with Supabase healthy. Before terminating any process, confirm its exact
PID, command, owner, and listening port; never kill an unrelated service.

---

## Rules (Do Not Break These)

### Starting / Restarting the Process

```bash
# CORRECT — always use the ecosystem config:
cd /opt/last-human-standing/current
pm2 start ecosystem.config.cjs --update-env    # first time
pm2 restart last-human-standing --update-env    # subsequent deploys
pm2 save                                        # persist for reboot

# NEVER DO THIS:
pm2 start server/index.js                      # loses cwd, max_restarts, node_args
sudo pm2 start ...                             # runs under root — wrong user
```

### User and Permissions

- The process MUST run as the `deploy` user (uid that owns `/opt/last-human-standing`).
- Never use `sudo pm2` for this app. The deploy user's pm2 daemon is managed by
  `pm2-deploy.service`.
- If you see the process under root's pm2 (`sudo pm2 list`), delete it immediately.

### Monitoring for Crash Loops

Signs of a crash loop:
- Restart count growing rapidly (`pm2 list` shows large number in the `↺` column)
- Process status flickering between `online` and `errored`
- Log files growing fast (`du -sh /home/deploy/.pm2/logs/`)

Quick triage:
```bash
# Check restart count and status
pm2 describe last-human-standing | grep -E 'restarts|status|exec_cwd'

# Check recent errors
pm2 logs last-human-standing --lines 20 --nostream

# Check log file sizes
du -sh /home/deploy/.pm2/logs/*
```

### Log Rotation

System logrotate handles pm2 logs via `/etc/logrotate.d/pm2-deploy`:
- Daily rotation, 7 copies retained, compressed
- Hard cap: 100 MB per file (rotates immediately if exceeded)
- Uses `copytruncate` (no pm2 restart needed)

Force rotation manually:
```bash
sudo logrotate -f /etc/logrotate.d/pm2-deploy
```

### Emergency: Disk Full from Logs

```bash
# 1. Stop the crash-looping process
pm2 stop last-human-standing

# 2. Truncate (not delete) the logs — pm2 keeps file handles open
truncate -s 0 /home/deploy/.pm2/logs/last-human-standing-error-*.log
truncate -s 0 /home/deploy/.pm2/logs/last-human-standing-out-*.log

# 3. Diagnose before restarting
pm2 logs last-human-standing --lines 5 --nostream
# Fix the underlying issue, then:
pm2 start ecosystem.config.cjs --update-env
```

### Deploy Script Safeguards

`scripts/preflight.sh` now checks (before deploy):
- Process not running under root (FATAL — blocks deploy)
- Process cwd matches `/opt/last-human-standing/current` (FATAL)
- Restart count < 50 (WARN)
- Log sizes < 500 MB (WARN)

`scripts/deploy.sh` now checks (during deploy):
- Same cwd/user/restart validations before calling `pm2 restart`
- If process is missing, bootstraps from `ecosystem.config.cjs` (never bare start)
- Post-restart health gate: verifies process is `online` and warns if it makes more than two **new** restarts during the five-second gate (it does not mistake a historical cumulative count for a new crash loop)
- `scripts/package-release.sh` uploads and invokes the release's `deploy.sh` from a unique `/tmp` path, so newly added safeguards apply to that same first rollout rather than waiting for the following release

### Server Layout Reference

```
/opt/last-human-standing/
  current/          -> symlink to latest release
  releases/         -> timestamped release dirs (kept: current + 1 previous)
  shared/
    .env            -> runtime secrets (never in tarball)
    node_modules/   -> production deps (npm ci --omit=dev)

/home/deploy/.pm2/
  logs/             -> pm2 stdout/stderr logs (logrotated)
  dump.pm2          -> saved process list (pm2 save)
  pm2.pid           -> daemon PID (used by systemd)

/etc/systemd/system/
  pm2-deploy.service  -> manages deploy user's pm2 daemon (ENABLED)
  pm2-root.service    -> root pm2 daemon (DISABLED, keep as safety net)

/etc/logrotate.d/
  pm2-deploy        -> rotates /home/deploy/.pm2/logs/*.log
  pm2-root          -> rotates /root/.pm2/logs/*.log (safety net)
```

### Key Config: ecosystem.config.cjs

```javascript
module.exports = {
  apps: [{
    name: "last-human-standing",
    script: "server/index.js",
    cwd: "/opt/last-human-standing/current",  // CRITICAL — must include /current
    node_args: "--import dotenv/config",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_restarts: 10,        // safety cap — prevents infinite crash loops
    max_memory_restart: "512M",
    env: { NODE_ENV: "production" },
  }],
};
```

The `max_restarts: 10` setting means PM2 will stop attempting after 10 consecutive
failures. This is the safety valve that prevents disk-filling crash loops. It only
works when the process is started from this config file.
