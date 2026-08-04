import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const localEnvPath = path.join(currentDirectory, ".env.local");

function applyLocalEnv() {
  if (!existsSync(localEnvPath)) {
    return;
  }

  for (const rawLine of readFileSync(localEnvPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator < 1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parsePort(value) {
  const port = Number.parseInt(value ?? "8787", 10);
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : 8787;
}

function parseOrigins(value) {
  const defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "null",
  ];

  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : defaults;
}

applyLocalEnv();

export const wishApiConfig = Object.freeze({
  host: process.env.WISH_API_HOST || "127.0.0.1",
  port: parsePort(process.env.WISH_API_PORT),
  allowedOrigins: parseOrigins(process.env.WISH_API_ALLOWED_ORIGINS),
  telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
});
