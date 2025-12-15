module.exports = {
  apps: [{
    name: 'ordertrack',
    script: 'dist/index.cjs',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5005,
      DATABASE_URL: './data/database.sqlite',
      SESSION_SECRET: 'change-this-secret-key'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    source_map_support: true,
  }]
};

