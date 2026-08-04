import { createServer } from "node:http";
import { wishApiConfig } from "./config.mjs";

function sendJson(response, statusCode, payload, origin) {
  const body = JSON.stringify(payload);
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.setHeader("Cache-Control", "no-store");

  if (origin && wishApiConfig.allowedOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }

  response.end(body);
}

const server = createServer((request, response) => {
  const origin = request.headers.origin;

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    if (origin && wishApiConfig.allowedOrigins.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Vary", "Origin");
    }
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(
      response,
      200,
      {
        ok: true,
        service: "birthday-wish-api",
        mode: "local",
        telegramConfigured: wishApiConfig.telegramConfigured,
      },
      origin,
    );
    return;
  }

  if (request.method === "POST" && request.url === "/api/wishes") {
    sendJson(
      response,
      503,
      {
        ok: false,
        error: "Wish delivery will be enabled in Phase 4.",
      },
      origin,
    );
    return;
  }

  sendJson(response, 404, { ok: false, error: "Not found." }, origin);
});

server.on("error", (error) => {
  console.error(`Wish API could not start: ${error.message}`);
  process.exitCode = 1;
});

server.listen(wishApiConfig.port, wishApiConfig.host, () => {
  console.log(
    `Wish API listening on http://${wishApiConfig.host}:${wishApiConfig.port}`,
  );
});

function closeServer() {
  server.close(() => process.exit(0));
}

process.once("SIGINT", closeServer);
process.once("SIGTERM", closeServer);
