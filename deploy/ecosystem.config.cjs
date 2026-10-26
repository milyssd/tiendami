const path = process.getBuiltinModule('node:path');
const cwd = path.resolve(__dirname, '..');
module.exports = {
  apps: [
    {
      name: 'tiendami-web',
      cwd,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '800M',
      time: true,
    },
    {
      name: 'tiendami-reservations',
      cwd,
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'scripts/worker.ts',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '250M',
      time: true,
    },
  ],
};
