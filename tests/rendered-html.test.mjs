import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the birthday prototype instead of the starter skeleton", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Birthday Generator — Prototype<\/title>/i);
  assert.match(html, /Có một món quà đang chờ bạn\./);
  assert.match(html, /Nhập ngày sinh để mở ra nhé/);
  assert.doesNotMatch(html, /react-loading-skeleton|Building your site|codex-preview/i);
});

test("keeps fixed birthday data and seven-scene runtime inside the product surface", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("./package.json", templateRoot), "utf8"),
  ]);

  assert.match(page, /const birthdayData/);
  assert.match(page, /"Dramatic intro"/);
  assert.match(page, /"Grand finale"/);
  assert.match(page, /normalizeDateInput/);
  assert.match(page, /CelebrationCanvas/);
  assert.match(page, /function CosmicStage/);
  assert.match(page, /point-cloud/);
  assert.match(page, /visibilitychange/);
  assert.match(page, /setPointerCapture/);
  assert.match(page, /storeWishInVessel/);
  assert.match(layout, /Birthday Generator — Prototype/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("keeps the recipient prototype as one self-contained HTML file", async () => {
  const prototype = await readFile(
    new URL("../birthday-template/prototype.html", import.meta.url),
    "utf8",
  );
  const script = prototype.match(/<script>([\s\S]*)<\/script>/i)?.[1];

  assert.ok(script, "prototype must contain an inline runtime script");
  assert.match(prototype, /const birthdayData/);
  assert.match(prototype, /Dramatic intro/);
  assert.match(prototype, /Grand finale/);
  assert.match(prototype, /normalizeDate/);
  assert.match(prototype, /data-blow/);
  assert.match(prototype, /class="smoke one"/);
  assert.match(prototype, /const confetti/);
  assert.doesNotMatch(prototype, /<script[^>]+\bsrc=/i);
  assert.doesNotMatch(prototype, /<link[^>]+\bhref=/i);
  assert.doesNotThrow(() => new Function(script));
});
