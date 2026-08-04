import { readFile, writeFile } from "node:fs/promises";

const templateUrl = new URL("../birthday-template/prototype.html", import.meta.url);
const cursorAssets = [
  {
    constant: "CUSTOM_CURSOR_IDLE_ASSET",
    marker: "__PANDA_BAMBOO_CURSOR_IDLE_DATA_URL__",
    url: new URL("../public/assets/panda-bamboo-cursor-idle.png", import.meta.url),
  },
  {
    constant: "CUSTOM_CURSOR_PAW_UP_ASSET",
    marker: "__PANDA_BAMBOO_CURSOR_PAW_UP_DATA_URL__",
    url: new URL("../public/assets/panda-bamboo-cursor-paw-up.png", import.meta.url),
  },
  {
    constant: "CUSTOM_CURSOR_TAP_ASSET",
    marker: "__PANDA_BAMBOO_CURSOR_TAP_DATA_URL__",
    url: new URL("../public/assets/panda-bamboo-cursor-tap.png", import.meta.url),
  },
];
const legacyCursorPattern = /const CUSTOM_CURSOR_ASSET = "(?:__PASTEL_CAT_PAW_CURSOR_DATA_URL__|data:image\/png;base64,[^"]*)";/;

const [template, ...files] = await Promise.all([
  readFile(templateUrl, "utf8"),
  ...cursorAssets.map(({ url }) => readFile(url)),
]);

const cursorDeclarations = cursorAssets
  .map(({ constant, marker }) => `const ${constant} = "${marker}";`)
  .join("\n      ");
let foundCursorMarker = legacyCursorPattern.test(template);
let updated = template.replace(legacyCursorPattern, cursorDeclarations);

for (const [index, { constant, marker }] of cursorAssets.entries()) {
  const pattern = new RegExp(`const ${constant} = \"(?:${marker}|data:image\\/png;base64,[^\"]*)\";`);
  foundCursorMarker ||= pattern.test(updated);
  const dataUrl = `data:image/png;base64,${files[index].toString("base64")}`;
  updated = updated.replace(pattern, `const ${constant} = "${dataUrl}";`);
}

if (!foundCursorMarker) {
  throw new Error("The birthday template is missing its custom cursor marker.");
}

await writeFile(templateUrl, updated, "utf8");
