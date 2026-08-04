import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderBirthdayHtml } from "../shared/template-builder.mjs";

const [dataFile, outputFile, musicFile, launchSoundFile] = process.argv.slice(2);
const defaultMusicFile = new URL("../public/audio/happy-birthday-music-box.mp3", import.meta.url);
const defaultLaunchSoundFile = new URL("../public/audio/wish-rocket-launch.mp3", import.meta.url);

if (!dataFile || !outputFile) {
  throw new Error("Usage: node scripts/render-birthday-html.mjs <birthday-data.json> <output.html> [music.mp3] [launch.mp3]");
}

function asEmbeddedMp3(buffer) {
  return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
}

const [template, rawData, music, launchSound] = await Promise.all([
  readFile(new URL("../birthday-template/prototype.html", import.meta.url), "utf8"),
  readFile(resolve(dataFile), "utf8"),
  readFile(musicFile ? resolve(musicFile) : defaultMusicFile),
  readFile(launchSoundFile ? resolve(launchSoundFile) : defaultLaunchSoundFile),
]);

const data = JSON.parse(rawData);
data.defaultMusicDataUrl ??= asEmbeddedMp3(music);
data.launchSoundDataUrl ??= asEmbeddedMp3(launchSound);
const html = renderBirthdayHtml(template, data);
await writeFile(resolve(outputFile), html, "utf8");
