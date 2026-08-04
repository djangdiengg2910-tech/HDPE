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

test("server-renders the local birthday Generator instead of the starter skeleton", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Birthday Generator — Local MVP<\/title>/i);
  assert.match(html, /Tạo thiệp sinh nhật sống động từ ảnh và lời nhắn của bạn\./);
  assert.match(html, /Chọn ảnh chân dung/);
  assert.match(html, /Tải file HTML tự chứa/);
  assert.doesNotMatch(html, /react-loading-skeleton|Building your site|codex-preview/i);
});

test("keeps the Phase 3 form, Canvas ASCII pipeline, sandbox preview, and Blob export in the product surface", async () => {
  const [page, cursor, layout, packageJson, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/custom-cursor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("./package.json", templateRoot), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /deriveInitials/);
  assert.match(page, /function imageToAscii/);
  assert.match(page, /getImageData/);
  assert.match(page, /ASCII_DEBOUNCE_MS/);
  assert.match(page, /FileReader|URL\.createObjectURL/);
  assert.match(page, /renderBirthdayHtml/);
  assert.match(page, /srcDoc=\{previewHtml\}/);
  assert.match(page, /sandbox="allow-scripts"/);
  assert.match(page, /new Blob\(\[html\]/);
  assert.match(page, /safeFilename/);
  assert.match(page, /FILE_SIZE_BUDGET/);
  assert.match(page, /colorRows/);
  assert.match(page, /CustomCursor/);
  assert.match(cursor, /panda-bamboo-cursor-idle\.png/);
  assert.match(cursor, /pointermove/);
  assert.match(cursor, /is-tapping/);
  assert.match(cursor, /prefers-reduced-motion/);
  assert.match(styles, /\.generator-grid/);
  assert.match(styles, /\.has-custom-cursor/);
  assert.match(styles, /@media \(max-width: 920px\)/);
  assert.match(layout, /Birthday Generator — Local MVP/);
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
  assert.match(prototype, /wish-letter-stage/);
  assert.match(prototype, /rocket-bottle/);
  assert.match(prototype, /firework-overlay/);
  assert.match(prototype, /id="unlock-transition"/);
  assert.match(prototype, /showUnlockBalloons/);
  assert.match(prototype, /balloon-flood-right/);
  assert.match(prototype, /const count = reducedMotion \? 10 : 42/);
  assert.match(prototype, /showUnlockBalloons\(\); setMusic\(true, true\)/);
  assert.match(prototype, /setMusic\(true, false, true\)/);
  assert.match(prototype, /reducedMotion \? 180 : 1280/);
  assert.match(prototype, /cinematic-letter-pass/);
  assert.match(prototype, /const introWords = birthdayData\.recipientName\.trim\(\)\.split/);
  assert.match(prototype, /function renderPortraitAscii\(\)/);
  assert.match(prototype, /portraitColorRows/);
  assert.match(prototype, /mountCustomCursor/);
  assert.match(prototype, /data:image\/png;base64,/);
  assert.doesNotMatch(prototype, /<script[^>]+\bsrc=/i);
  assert.doesNotMatch(prototype, /<link[^>]+\bhref=/i);
  assert.doesNotThrow(() => new Function(script));
});

test("keeps music and celebration sound effects in the self-contained recipient template", async () => {
  const prototype = await readFile(new URL("../birthday-template/prototype.html", import.meta.url), "utf8");

  assert.match(prototype, /musicBoxMelody/);
  assert.match(prototype, /createMusicBoxEngine/);
  assert.match(prototype, /playNoiseBurst/);
  assert.match(prototype, /backgroundTrack\.volume = .*shouldMute/);
  assert.match(prototype, /playSoundEffect\("launch"\)|playEffect\("launch"\)/);
  assert.match(prototype, /playSoundEffect\("firework"\)|playEffect\("firework"\)/);
});
