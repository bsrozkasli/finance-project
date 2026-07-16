const { spawn } = require('node:child_process');

const [, , timeoutMsRaw, command, ...args] = process.argv;
const timeoutMs = Number.parseInt(timeoutMsRaw, 10);

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !command) {
  console.error('Usage: node scripts/run-with-timeout.cjs <timeout-ms> <command> [args...]');
  process.exit(2);
}

const child = spawn(command, args, {
  shell: process.platform === 'win32',
  stdio: 'inherit',
  windowsHide: true,
});

const timer = setTimeout(() => {
  console.error(`Command timed out after ${timeoutMs} ms: ${[command, ...args].join(' ')}`);
  child.kill('SIGTERM');

  setTimeout(() => {
    if (!child.killed) {
      child.kill('SIGKILL');
    }
  }, 5000).unref();
}, timeoutMs);

child.on('exit', (code, signal) => {
  clearTimeout(timer);

  if (signal) {
    process.exit(signal === 'SIGTERM' ? 124 : 1);
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  clearTimeout(timer);
  console.error(error.message);
  process.exit(1);
});