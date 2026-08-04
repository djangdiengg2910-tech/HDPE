import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const services = [
  {
    name: "generator",
    command: npmCommand,
    args: ["run", "dev:generator"],
  },
  {
    name: "wish-api",
    command: process.execPath,
    args: ["wish-api/server.mjs"],
  },
];

let shuttingDown = false;
const children = services.map((service) => {
  const child = spawn(service.command, service.args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32" && service.command.endsWith(".cmd"),
  });

  child.once("error", (error) => {
    console.error(`[${service.name}] Could not start: ${error.message}`);
    stop(1);
  });

  child.once("exit", (code, signal) => {
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
      console.error(`[${service.name}] Stopped unexpectedly (${reason}).`);
      stop(code ?? 1);
    }
  });

  return child;
});

function stop(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  process.exitCode = exitCode;
  setTimeout(() => process.exit(exitCode), 5_000).unref();
}

process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));
