#!/usr/bin/env node

const { spawn } = require("node:child_process");

const [timeoutText, command, ...args] = process.argv.slice(2);
const timeoutMs = Number(timeoutText);

if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || !command) {
  console.error("Usage: node scripts/run-with-timeout.cjs <timeout-ms> <command> [args...]");
  process.exit(2);
}

const child = spawn(command, args, {
  shell: process.platform === "win32",
  stdio: "inherit",
});

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}, timeoutMs);

child.on("error", (error) => {
  clearTimeout(timer);
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  clearTimeout(timer);
  if (timedOut) {
    console.error(`Command exceeded ${timeoutMs} ms and was terminated.`);
    process.exit(124);
  }
  if (signal) {
    console.error(`Command terminated by signal ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
