/** Escape text for an HTML text or attribute context. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;",
  })[character]);
}

/**
 * Serializes JSON for a <script type="application/json"> element. Escaping
 * angle brackets prevents user content such as </script> from closing the tag.
 */
export function serializeJsonForHtml(value) {
  const json = JSON.stringify(value);
  if (typeof json !== "string") {
    throw new TypeError("Birthday data must be JSON serializable");
  }

  return json
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
