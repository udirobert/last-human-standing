// PM2 ecosystem config for last-human-standing production.
// Usage: pm2 startOrReload ecosystem.config.cjs --update-env
module.exports = {
  apps: [
    {
      name: "last-human-standing",
      script: "server/index.js",
      cwd: "/opt/last-human-standing/current",
      node_args: "--import dotenv/config",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
