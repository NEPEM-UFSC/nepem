const { spawn } = require('child_process');

const args = process.argv.slice(2);
const npmArgv = (() => {
  try {
    return process.env.npm_config_argv ? JSON.parse(process.env.npm_config_argv) : null;
  } catch {
    return null;
  }
})();

const npmArgText = [
  ...(npmArgv?.original || []),
  ...(npmArgv?.remain || []),
  ...(npmArgv?.cooked || []),
].join(' ');

const isProd =
  process.env.npm_config_prod === 'true' ||
  process.env.npm_config_production === 'true' ||
  args.includes('--prod') ||
  args.includes('prod') ||
  npmArgText.includes('--prod') ||
  npmArgText.includes('--production');

const env = {
  ...process.env,
  NODE_ENV: isProd ? 'production' : process.env.NODE_ENV || 'development',
  NEPEM_ENV: isProd ? 'prod' : process.env.NEPEM_ENV || 'dev',
};

if (process.env.NEPEM_DEBUG_START === '1') {
  console.log(
    JSON.stringify(
      {
        npm_config_prod: process.env.npm_config_prod,
        npm_config_production: process.env.npm_config_production,
        npm_config_argv: process.env.npm_config_argv || null,
        npm_lifecycle_script: process.env.npm_lifecycle_script,
        argv: process.argv.slice(2),
      },
      null,
      2,
    ),
  );
}

const child = spawn(process.execPath, ['server.js'], {
  stdio: 'inherit',
  env,
});

const modeLabel = isProd ? 'production' : 'development';
const url = isProd
  ? 'http://localhost:8000/?nepem-env=prod'
  : 'http://localhost:8000/?nepem-env=dev';

console.log(`Starting NEPEM in ${modeLabel} mode.`);
console.log(`Open: ${url}`);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
