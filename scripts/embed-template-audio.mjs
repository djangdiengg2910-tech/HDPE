import { readFile, writeFile } from "node:fs/promises";
import { renderBirthdayHtml } from "../shared/template-builder.mjs";

const templateUrl = new URL("../birthday-template/prototype.html", import.meta.url);
const musicUrl = new URL("../public/audio/happy-birthday-music-box.mp3", import.meta.url);
const launchUrl = new URL("../public/audio/wish-rocket-launch.mp3", import.meta.url);
const payloadPattern = /<script\b[^>]*\bid=["']birthday-data["'][^>]*>([\s\S]*?)<\/script>/i;

function toEmbeddedMp3(buffer) {
  return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
}

const [template, music, launchSound] = await Promise.all([
  readFile(templateUrl, "utf8"),
  readFile(musicUrl),
  readFile(launchUrl),
]);
const match = template.match(payloadPattern);
if (!match) throw new Error("The birthday template is missing its data payload.");

const data = JSON.parse(match[1]);
data.defaultMusicDataUrl = toEmbeddedMp3(music);
data.launchSoundDataUrl = toEmbeddedMp3(launchSound);
await writeFile(templateUrl, renderBirthdayHtml(template, data), "utf8");
