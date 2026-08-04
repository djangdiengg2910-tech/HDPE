export const BIRTHDAY_SCHEMA_VERSION = 1;

const MAX_NAME_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 8_000;
const MAX_ASCII_LENGTH = 80_000;
const MAX_COLOR_ROWS = 800;
const MAX_COLOR_ROW_LENGTH = 1_000;
const MAX_DATA_URL_LENGTH = 5_000_000;

const DEFAULT_PORTRAIT_ASCII = String.raw`
                 .:-=+++=-:.                 
             .-*%@@@@@@@@@@%*-.              
           .=%@@@@@@@@@@@@@@@@%=.            
          -%@@@@@@@%%%%%@@@@@@@%-            
         =@@@@@@@%*=-::-=*%@@@@@@=           
        +@@@@@@@+.  .--.  .+@@@@@@+          
       =@@@@@@@=   -@@@@-   =@@@@@@=         
       %@@@@@@@.   :@@@@:   .@@@@@@@%        
      :@@@@@@@%     ....     %@@@@@@@:       
      -@@@@@@@%  .-======-.  %@@@@@@@-       
      :@@@@@@@%  =@@@%%@@@=  %@@@@@@@:       
       %@@@@@@@.  .=****=.  .@@@@@@@%        
       =@@@@@@@=     ..     =@@@@@@=         
        +@@@@@@@+.        .+@@@@@@+          
         =@@@@@@@%*=-::-=*%@@@@@@=           
          -%@@@@@@@@%%%%@@@@@@@@%-            
           .=%@@@@@@@@@@@@@@@@%=.             
             .-*%@@@@@@@@@@%*-.               
                 .:-=+++=-:.                  
`;

export const defaultBirthdayData = Object.freeze({
  schemaVersion: BIRTHDAY_SCHEMA_VERSION,
  recipientName: "Phạm Trường Giang",
  initials: Object.freeze(["P", "T", "G"]),
  birthday: "2004-08-15",
  message:
    "Mong bạn luôn giữ được sự tò mò, sự tử tế và bản lĩnh đi đến nơi bạn muốn.\n\nTuổi mới không cần hoàn hảo — chỉ cần có thêm những chuyến đi đáng nhớ, những người thật lòng, và thật nhiều ngày mà bạn thấy mình đang sống đúng ý.\n\nHappy birthday. Cứ rực rỡ theo cách của riêng bạn nhé ✦",
  portraitAscii: Object.freeze({
    text: DEFAULT_PORTRAIT_ASCII,
    colorRows: null,
    columns: 72,
    inverted: false,
  }),
  theme: "cosmic-blue",
  // A null value makes the self-contained Web Audio fallback play. Custom audio
  // must be embedded as a data:audio URL; remote URLs are deliberately rejected.
  defaultMusicDataUrl: null,
  launchSoundDataUrl: null,
  giftId: null,
  wishEndpoint: null,
});

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n?/g, "\n");
}

function normalizeText(value) {
  return normalizeLineEndings(value.normalize("NFKC"));
}

function isIsoCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function firstGrapheme(value) {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });
    return segmenter.segment(value)[Symbol.iterator]().next().value?.segment ?? "";
  }

  return Array.from(value)[0] ?? "";
}

/** Create display initials without breaking Vietnamese or other Unicode graphemes. */
export function deriveInitials(recipientName) {
  if (typeof recipientName !== "string") return [];

  return normalizeText(recipientName)
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => firstGrapheme(part).toLocaleUpperCase("vi-VN"));
}

function normaliseInitials(value, recipientName, errors) {
  const derived = deriveInitials(recipientName);
  if (!Array.isArray(value)) return derived;

  const initials = value
    .filter((item) => typeof item === "string")
    .map((item) => normalizeText(item).trim())
    .filter(Boolean)
    .slice(0, 16)
    .map((item) => firstGrapheme(item).toLocaleUpperCase("vi-VN"));

  if (!initials.length) {
    errors.push("initials must contain at least one character");
    return derived;
  }

  return initials;
}

function normaliseColorRows(value, errors) {
  if (value == null) return null;
  if (!Array.isArray(value) || value.length > MAX_COLOR_ROWS) {
    errors.push("portraitAscii.colorRows must be null or a bounded string array");
    return null;
  }

  const rows = value.map((row) => (typeof row === "string" ? normalizeLineEndings(row) : null));
  if (rows.some((row) => row == null || row.length > MAX_COLOR_ROW_LENGTH)) {
    errors.push("portraitAscii.colorRows contains an invalid row");
    return null;
  }

  return rows;
}

function normalisePortrait(value, errors) {
  const source = isRecord(value) ? value : {};
  const fallback = defaultBirthdayData.portraitAscii;
  const text =
    typeof source.text === "string" && source.text.length <= MAX_ASCII_LENGTH
      ? normalizeLineEndings(source.text)
      : fallback.text;
  if (hasOwn(source, "text") && text === fallback.text && source.text !== fallback.text) {
    errors.push("portraitAscii.text must be a bounded string");
  }

  const columns = Number.isInteger(source.columns) && source.columns >= 12 && source.columns <= 240
    ? source.columns
    : fallback.columns;
  if (hasOwn(source, "columns") && columns === fallback.columns && source.columns !== fallback.columns) {
    errors.push("portraitAscii.columns must be an integer between 12 and 240");
  }

  const inverted = typeof source.inverted === "boolean" ? source.inverted : fallback.inverted;
  if (hasOwn(source, "inverted") && typeof source.inverted !== "boolean") {
    errors.push("portraitAscii.inverted must be boolean");
  }

  return { text, colorRows: normaliseColorRows(source.colorRows, errors), columns, inverted };
}

function normaliseDataUrl(value, errors) {
  if (value == null || value === "") return null;
  if (
    typeof value !== "string" ||
    value.length > MAX_DATA_URL_LENGTH ||
    !/^data:audio\/[a-z0-9.+-]+(?:;[a-z0-9.+-]+)*(?:;base64)?,/i.test(value)
  ) {
    errors.push("defaultMusicDataUrl must be an embedded data:audio URL");
    return null;
  }
  return value;
}

function normaliseOptionalString(value, name, maxLength, errors, pattern = null) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength || (pattern && !pattern.test(value))) {
    errors.push(`${name} is invalid`);
    return null;
  }
  return value;
}

/**
 * Validates and normalizes data for an exported gift. Invalid optional fields
 * become safe fallbacks; `valid` tells the generator whether it should show a
 * validation error before exporting.
 */
export function validateBirthdayData(input) {
  const source = isRecord(input) ? input : {};
  const errors = [];

  const rawName = typeof source.recipientName === "string" ? normalizeText(source.recipientName).trim().replace(/\s+/gu, " ") : "";
  const recipientName = rawName && rawName.length <= MAX_NAME_LENGTH ? rawName : defaultBirthdayData.recipientName;
  if (!rawName || rawName.length > MAX_NAME_LENGTH) errors.push("recipientName must be 1–120 characters");

  const birthday = typeof source.birthday === "string" ? source.birthday : "";
  const normalizedBirthday = isIsoCalendarDate(birthday) ? birthday : defaultBirthdayData.birthday;
  if (!isIsoCalendarDate(birthday)) errors.push("birthday must be a real YYYY-MM-DD date");

  const rawMessage = typeof source.message === "string" ? normalizeText(source.message) : "";
  const message = rawMessage.trim() && rawMessage.length <= MAX_MESSAGE_LENGTH ? rawMessage : defaultBirthdayData.message;
  if (!rawMessage.trim() || rawMessage.length > MAX_MESSAGE_LENGTH) errors.push("message must be 1–8000 characters");

  const schemaVersion = source.schemaVersion === BIRTHDAY_SCHEMA_VERSION ? BIRTHDAY_SCHEMA_VERSION : BIRTHDAY_SCHEMA_VERSION;
  if (hasOwn(source, "schemaVersion") && source.schemaVersion !== BIRTHDAY_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${BIRTHDAY_SCHEMA_VERSION}`);
  }

  const data = {
    schemaVersion,
    recipientName,
    initials: normaliseInitials(source.initials, recipientName, errors),
    birthday: normalizedBirthday,
    message,
    portraitAscii: normalisePortrait(source.portraitAscii, errors),
    theme: source.theme === "cosmic-blue" ? "cosmic-blue" : defaultBirthdayData.theme,
    defaultMusicDataUrl: normaliseDataUrl(source.defaultMusicDataUrl, errors),
    launchSoundDataUrl: normaliseDataUrl(source.launchSoundDataUrl, errors),
    giftId: normaliseOptionalString(source.giftId, "giftId", 128, errors, /^gift_[A-Za-z0-9_-]+$/),
    wishEndpoint: normaliseOptionalString(
      source.wishEndpoint,
      "wishEndpoint",
      200,
      errors,
      /^http:\/\/127\.0\.0\.1(?::\d{2,5})?\/api\/wishes$/,
    ),
  };

  if (hasOwn(source, "theme") && source.theme !== "cosmic-blue") {
    errors.push("theme must be cosmic-blue");
  }

  return { data, errors, valid: errors.length === 0 };
}

/** Return normalized data, or throw a useful error when the input is invalid. */
export function assertBirthdayData(input) {
  const result = validateBirthdayData(input);
  if (!result.valid) {
    throw new TypeError(`Invalid birthday data: ${result.errors.join("; ")}`);
  }
  return result.data;
}
