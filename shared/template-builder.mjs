import { assertBirthdayData } from "./birthday-schema.mjs";
import { serializeJsonForHtml } from "./escape.mjs";

const DATA_SCRIPT = /(<script\b(?=[^>]*\bid=["']birthday-data["'])(?=[^>]*\bdata-birthday-template(?:=["'][^"']*["'])?)[^>]*>)[\s\S]*?(<\/script>)/gi;

/** Replace the one data marker in the self-contained recipient template. */
export function renderBirthdayHtml(templateHtml, input) {
  if (typeof templateHtml !== "string") {
    throw new TypeError("templateHtml must be a string");
  }

  const data = assertBirthdayData(input);
  const serializedData = serializeJsonForHtml(data);
  let replacements = 0;
  const html = templateHtml.replace(DATA_SCRIPT, (_match, openingTag, closingTag) => {
    replacements += 1;
    return `${openingTag}\n${serializedData}\n${closingTag}`;
  });

  if (replacements !== 1) {
    throw new Error("Birthday template must contain exactly one birthday-data marker");
  }

  assertSelfContainedHtml(html);
  return html;
}

/** Fail early if a final gift would depend on a path, CDN, or remote script. */
export function assertSelfContainedHtml(html) {
  const externalAsset = /<(?:script|iframe|img|audio|video|source|track)\b[^>]*\bsrc\s*=|<link\b[^>]*\bhref\s*=/i;
  if (externalAsset.test(html)) {
    throw new Error("Final birthday HTML must not reference external assets");
  }

  if (/\b(?:https?:)?\/\//i.test(html.replace(/<script[\s\S]*?<\/script>/gi, ""))) {
    throw new Error("Final birthday HTML must not reference remote URLs outside its data block");
  }
}
