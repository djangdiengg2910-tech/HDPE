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
  const [page, layout, packageJson, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("./package.json", templateRoot), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const birthdayData/);
  assert.match(page, /"Dramatic intro"/);
  assert.match(page, /"Grand finale"/);
  assert.match(page, /normalizeDateInput/);
  assert.match(page, /CelebrationCanvas/);
  assert.match(page, /function CosmicStage/);
  assert.match(page, /function UnlockBalloonTransition/);
  assert.match(page, /isUnlocking/);
  assert.match(page, /length: reducedMotion \? 10 : 42/);
  assert.match(page, /turnMusicOn\(true\)/);
  assert.match(page, /turnMusicOn\(false, true\)/);
  assert.match(page, /reducedMotion \? 180 : 1280/);
  assert.match(page, /setIsUnlocking\(false\)/);
  assert.match(page, /const introWords = useMemo/);
  assert.match(page, /introWords\.map/);
  assert.match(styles, /\.cinematic-initials span \{[\s\S]*?position: absolute;/);
  assert.match(styles, /animation: cinematic-letter-pass 1\.54s/);
  assert.doesNotMatch(styles, /font-size: clamp\(13rem, 38vw, 33rem\)/);
  assert.doesNotMatch(styles, /scale\(1\.21\)/);
  assert.match(page, /Sếp của chúng tôi đã đích thân chuẩn bị chiếc bánh/);
  assert.match(page, /visibilitychange/);
  assert.match(page, /setPointerCapture/);
  assert.match(page, /sealWishInBottle/);
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
  assert.doesNotMatch(prototype, /<script[^>]+\bsrc=/i);
  assert.doesNotMatch(prototype, /<link[^>]+\bhref=/i);
  assert.doesNotThrow(() => new Function(script));
});

test("keeps music-box ambience and celebration sound effects self-contained", async () => {
  const [page, prototype] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../birthday-template/prototype.html", import.meta.url), "utf8"),
  ]);

  for (const runtime of [page, prototype]) {
    assert.match(runtime, /musicBoxMelody/);
    assert.match(runtime, /createMusicBoxEngine/);
    assert.match(runtime, /playNoiseBurst/);
    assert.match(runtime, /backgroundTrack\.volume = .*shouldMute/);
    assert.match(runtime, /playSoundEffect\("launch"\)|playEffect\("launch"\)/);
    assert.match(runtime, /playSoundEffect\("firework"\)|playEffect\("firework"\)/);
  }
});
