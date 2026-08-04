import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertBirthdayData,
  defaultBirthdayData,
  deriveInitials,
  validateBirthdayData,
} from "../shared/birthday-schema.mjs";
import { serializeJsonForHtml } from "../shared/escape.mjs";
import { renderBirthdayHtml } from "../shared/template-builder.mjs";

const templateUrl = new URL("../birthday-template/prototype.html", import.meta.url);
const shortFixtureUrl = new URL("./fixtures/birthday-short.json", import.meta.url);
const longFixtureUrl = new URL("./fixtures/birthday-long.json", import.meta.url);

async function fixture(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function birthdayPayload(html) {
  const match = html.match(/<script\b[^>]*\bid=["']birthday-data["'][^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(match, "final HTML must contain the birthday JSON payload");
  return match[1];
}

test("derives locale-safe initials and supplies bounded fallbacks", () => {
  assert.deepEqual(deriveInitials("  Nguyễn   Thị Minh Anh  "), ["N", "T", "M", "A"]);
  assert.deepEqual(deriveInitials("👩🏽‍🚀 An"), ["👩🏽‍🚀", "A"]);

  const result = validateBirthdayData({
    recipientName: "  Nguyễn   Thị Minh Anh  ",
    birthday: "2025-02-30",
    message: " ",
    portraitAscii: { columns: 2 },
  });

  assert.equal(result.valid, false);
  assert.equal(result.data.recipientName, "Nguyễn Thị Minh Anh");
  assert.deepEqual(result.data.initials, ["N", "T", "M", "A"]);
  assert.equal(result.data.birthday, defaultBirthdayData.birthday);
  assert.equal(result.data.message, defaultBirthdayData.message);
  assert.equal(result.data.portraitAscii.columns, defaultBirthdayData.portraitAscii.columns);
  assert.throws(() => assertBirthdayData({ recipientName: "" }), /Invalid birthday data/);
});

test("serializes hostile text safely inside an application/json script", () => {
  const dangerous = { message: "</script><script>window.pwned = true</script>&\u2028\u2029" };
  const serialized = serializeJsonForHtml(dangerous);

  assert.doesNotMatch(serialized, /<|>|&|<\/script/i);
  assert.deepEqual(JSON.parse(serialized), dangerous);
});

test("renders the same one-file template for short and long fixtures", async () => {
  const [template, shortData, longData] = await Promise.all([
    readFile(templateUrl, "utf8"),
    fixture(shortFixtureUrl),
    fixture(longFixtureUrl),
  ]);
  const shortHtml = renderBirthdayHtml(template, shortData);
  const longHtml = renderBirthdayHtml(template, longData);

  for (const [html, data] of [[shortHtml, shortData], [longHtml, longData]]) {
    assert.match(html, /data-birthday-template="v1"/);
    assert.equal((html.match(/id="birthday-data"/g) ?? []).length, 1);
    assert.doesNotMatch(html, /<script[^>]+\bsrc=/i);
    assert.doesNotMatch(html, /<link[^>]+\bhref=/i);
    assert.doesNotMatch(html, /<(?:img|audio|video|iframe|source|track)\b[^>]*\bsrc=/i);
    assert.deepEqual(JSON.parse(birthdayPayload(html)), data);
  }

  assert.doesNotMatch(longHtml, /<\/script><script>window\.xss/i);
  assert.match(longHtml, /\\u003C\/script\\u003E\\u003Cscript\\u003Ewindow\.xss/);
  assert.match(template, /aria-label="\$\{escapeHtml\(introWords\.join\(" "\)\)\}"/);
});

test("embeds the supplied music-box and rocket MP3 files in the executable template", async () => {
  const template = await readFile(templateUrl, "utf8");
  const data = JSON.parse(birthdayPayload(template));

  assert.match(data.defaultMusicDataUrl, /^data:audio\/mpeg;base64,/);
  assert.match(data.launchSoundDataUrl, /^data:audio\/mpeg;base64,/);
  assert.doesNotMatch(template, /happy-birthday-music-box\.mp3|wish-rocket-launch\.mp3/);
});
