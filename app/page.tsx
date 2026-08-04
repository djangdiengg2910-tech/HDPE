"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CustomCursor } from "@/app/custom-cursor";
import { deriveInitials } from "@/shared/birthday-schema.mjs";
import { renderBirthdayHtml } from "@/shared/template-builder.mjs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_SIDE = 6000;
const MIN_IMAGE_SIDE = 40;
const FILE_SIZE_BUDGET = 5 * 1024 * 1024;
const ASCII_DEBOUNCE_MS = 180;
const PREVIEW_DEBOUNCE_MS = 280;
const ASCII_RAMP = "@%#*+=-:. ";

type FormValues = {
  recipientName: string;
  birthday: string;
  message: string;
};

type AsciiSettings = {
  columns: number;
  brightness: number;
  contrast: number;
  inverted: boolean;
  color: boolean;
};

type AsciiPortrait = {
  text: string;
  colorRows: string[] | null;
  columns: number;
  inverted: boolean;
};

type FormErrors = Partial<Record<keyof FormValues | "portrait", string>>;

const EMPTY_FORM: FormValues = {
  recipientName: "",
  birthday: "",
  message: "",
};

const DEFAULT_SETTINGS: AsciiSettings = {
  columns: 72,
  brightness: 0,
  contrast: 0,
  inverted: false,
  color: false,
};

type GiftTemplate = {
  html: string;
  defaultMusicDataUrl: string | null;
  launchSoundDataUrl: string | null;
};

function parseGiftTemplate(html: string): GiftTemplate {
  const match = html.match(
    /<script\b(?=[^>]*\bid=["']birthday-data["'])[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) throw new Error("Không tìm thấy dữ liệu mặc định của template.");
  const data = JSON.parse(match[1]);
  return {
    html,
    defaultMusicDataUrl: typeof data.defaultMusicDataUrl === "string" ? data.defaultMusicDataUrl : null,
    launchSoundDataUrl: typeof data.launchSoundDataUrl === "string" ? data.launchSoundDataUrl : null,
  };
}

let giftTemplatePromise: Promise<GiftTemplate> | null = null;

function loadGiftTemplate() {
  giftTemplatePromise ??= import("@/birthday-template/prototype.html?raw")
    .then(({ default: html }) => parseGiftTemplate(html));
  return giftTemplatePromise;
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function safeFilename(recipientName: string) {
  const normalized = recipientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `HappyBirthday_${normalized || "gift"}.html`;
}

function fileSizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function channelToHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function adjustChannel(value: number, brightness: number, contrast: number) {
  const shifted = value + brightness * 2.55;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  return clamp(factor * (shifted - 128) + 128, 0, 255);
}

function imageToAscii(image: HTMLImageElement, settings: AsciiSettings): AsciiPortrait {
  const columns = settings.columns;
  // Characters are taller than they are wide. This keeps the rendered output
  // close to a portrait crop instead of looking stretched horizontally.
  const rows = Math.max(18, Math.round(columns * 0.82));
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");

  const targetRatio = columns / (rows * 1.86);
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    columns,
    rows,
  );

  const pixels = context.getImageData(0, 0, columns, rows).data;
  const textRows: string[] = [];
  const colorRows: string[] = [];

  for (let y = 0; y < rows; y += 1) {
    let textRow = "";
    let colorRow = "";
    for (let x = 0; x < columns; x += 1) {
      const offset = (y * columns + x) * 4;
      const red = adjustChannel(pixels[offset], settings.brightness, settings.contrast);
      const green = adjustChannel(pixels[offset + 1], settings.brightness, settings.contrast);
      const blue = adjustChannel(pixels[offset + 2], settings.brightness, settings.contrast);
      let luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      if (settings.inverted) luminance = 255 - luminance;
      const characterIndex = Math.min(
        ASCII_RAMP.length - 1,
        Math.floor((luminance / 256) * ASCII_RAMP.length),
      );
      textRow += ASCII_RAMP[characterIndex];
      colorRow += `${channelToHex(red)}${channelToHex(green)}${channelToHex(blue)}`;
    }
    textRows.push(textRow);
    colorRows.push(colorRow);
  }

  return {
    text: textRows.join("\n"),
    colorRows: settings.color ? colorRows : null,
    columns,
    inverted: settings.inverted,
  };
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không thể đọc ảnh này. Hãy thử một ảnh PNG, JPG, WebP hoặc GIF khác."));
    image.src = source;
  });
}

function AsciiPreview({ portrait }: { portrait: AsciiPortrait | null }) {
  if (!portrait) {
    return <p className="ascii-placeholder">Ảnh ASCII sẽ hiện ở đây sau khi bạn chọn ảnh chân dung.</p>;
  }

  const rows = portrait.text.split("\n");
  if (!portrait.colorRows) {
    return <pre className="ascii-art" aria-label="Xem trước ảnh chân dung ASCII">{portrait.text}</pre>;
  }

  return (
    <pre className="ascii-art ascii-art-color" aria-label="Xem trước ảnh chân dung ASCII màu">
      {rows.map((row, rowIndex) => {
        const colors = portrait.colorRows?.[rowIndex] ?? "";
        return (
          <span className="ascii-row" key={`${rowIndex}-${row.length}`}>
            {Array.from(row).map((character, columnIndex) => (
              <i
                aria-hidden="true"
                key={`${rowIndex}-${columnIndex}`}
                style={{ color: `#${colors.slice(columnIndex * 6, columnIndex * 6 + 6) || "d6e7ff"}` }}
              >
                {character}
              </i>
            ))}
            {rowIndex < rows.length - 1 ? "\n" : ""}
          </span>
        );
      })}
    </pre>
  );
}

export default function Home() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [portrait, setPortrait] = useState<AsciiPortrait | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [imageError, setImageError] = useState("");
  const [isRenderingAscii, setIsRenderingAscii] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewStatus, setPreviewStatus] = useState("Điền thông tin và chọn ảnh để xem trước món quà.");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceRef = useRef<string | null>(null);

  const initials = useMemo(() => deriveInitials(values.recipientName), [values.recipientName]);

  const buildGiftData = useCallback((template: GiftTemplate) => ({
    schemaVersion: 1,
    recipientName: values.recipientName.trim().replace(/\s+/g, " "),
    initials,
    birthday: values.birthday,
    message: values.message,
    portraitAscii: portrait && {
      text: portrait.text,
      colorRows: portrait.colorRows,
      columns: portrait.columns,
      inverted: portrait.inverted,
    },
    theme: "cosmic-blue",
    defaultMusicDataUrl: template.defaultMusicDataUrl,
    launchSoundDataUrl: template.launchSoundDataUrl,
    giftId: null,
    wishEndpoint: null,
  }), [initials, portrait, values]);

  const validateForm = useCallback(() => {
    const nextErrors: FormErrors = {};
    const name = values.recipientName.trim();
    if (!name) nextErrors.recipientName = "Hãy nhập tên người nhận.";
    else if (name.length > 120) nextErrors.recipientName = "Tên tối đa 120 ký tự.";
    if (!isCalendarDate(values.birthday)) nextErrors.birthday = "Hãy chọn một ngày sinh hợp lệ.";
    if (!values.message.trim()) nextErrors.message = "Hãy viết một lời nhắn.";
    else if (values.message.length > 8000) nextErrors.message = "Lời nhắn tối đa 8.000 ký tự.";
    if (!portrait) nextErrors.portrait = "Hãy chọn ảnh chân dung để chuyển thành ASCII.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [portrait, values]);

  useEffect(() => {
    if (!imageSource) {
      imageRef.current = null;
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const image = imageRef.current ?? await loadImage(imageSource);
        if (cancelled) return;
        imageRef.current = image;
        setPortrait(imageToAscii(image, settings));
        setImageError("");
      } catch (error) {
        if (!cancelled) {
          setPortrait(null);
          setImageError(error instanceof Error ? error.message : "Không thể chuyển ảnh sang ASCII.");
        }
      } finally {
        if (!cancelled) setIsRenderingAscii(false);
      }
    }, ASCII_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [imageSource, settings]);

  useEffect(() => () => {
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
  }, []);

  useEffect(() => {
    if (!portrait || !values.recipientName.trim() || !isCalendarDate(values.birthday) || !values.message.trim()) {
      const clearTimer = window.setTimeout(() => {
        setPreviewHtml("");
        setFileSize(null);
        setPreviewError("");
        setPreviewStatus("Điền tên, ngày sinh, lời nhắn và chọn ảnh để xem trước món quà.");
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPreviewStatus("Đang nạp template và cập nhật preview…");
      try {
        const template = await loadGiftTemplate();
        if (cancelled) return;
        const html = renderBirthdayHtml(template.html, buildGiftData(template));
        setPreviewHtml(html);
        setFileSize(new Blob([html], { type: "text/html;charset=utf-8" }).size);
        setPreviewError("");
        setPreviewStatus("Preview đã sẵn sàng. File quà là HTML tự chứa.");
      } catch (error) {
        if (cancelled) return;
        setPreviewHtml("");
        setFileSize(null);
        setPreviewError(error instanceof Error ? error.message : "Không thể tạo preview.");
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [buildGiftData, portrait, values]);

  const updateValue = (field: keyof FormValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setExportStatus("");
  };

  const updateSetting = (field: keyof AsciiSettings) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === "checkbox" ? event.target.checked : Number(event.target.value);
    setSettings((current) => ({ ...current, [field]: value }));
    if (imageSource) setIsRenderingAscii(true);
    setExportStatus("");
  };

  const selectPortrait = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
      setImageError("Chỉ hỗ trợ ảnh PNG, JPG, WebP hoặc GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Ảnh tối đa 8 MB để việc chuyển ASCII vẫn mượt.");
      return;
    }

    const nextSource = URL.createObjectURL(file);
    try {
      const image = await loadImage(nextSource);
      if (
        image.naturalWidth < MIN_IMAGE_SIDE ||
        image.naturalHeight < MIN_IMAGE_SIDE ||
        image.naturalWidth > MAX_IMAGE_SIDE ||
        image.naturalHeight > MAX_IMAGE_SIDE
      ) {
        URL.revokeObjectURL(nextSource);
        setImageError(`Ảnh cần từ ${MIN_IMAGE_SIDE}px đến ${MAX_IMAGE_SIDE}px mỗi chiều.`);
        return;
      }
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
      sourceRef.current = nextSource;
      imageRef.current = image;
      setIsRenderingAscii(true);
      setImageSource(nextSource);
      setImageName(file.name);
      setImageError("");
      setErrors((current) => ({ ...current, portrait: undefined }));
      setExportStatus("");
    } catch (error) {
      URL.revokeObjectURL(nextSource);
      setImageError(error instanceof Error ? error.message : "Không thể đọc ảnh này.");
    }
  };

  const resetPortrait = () => {
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    sourceRef.current = null;
    imageRef.current = null;
    setImageSource(null);
    setImageName("");
    setPortrait(null);
    setIsRenderingAscii(false);
    setImageError("");
    setFileSize(null);
    setExportStatus("");
  };

  const exportGift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExportStatus("");
    if (!validateForm()) {
      setExportStatus("Kiểm tra lại các trường được đánh dấu trước khi tải file.");
      return;
    }
    setIsExporting(true);
    try {
      const template = await loadGiftTemplate();
      const html = renderBirthdayHtml(template.html, buildGiftData(template));
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeFilename(values.recipientName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setFileSize(blob.size);
      setExportStatus(`Đã tạo ${safeFilename(values.recipientName)}.`);
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "Không thể tạo file HTML.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="generator-page">
      <CustomCursor />
      <header className="generator-header">
        <a className="brand" href="#generator" aria-label="Birthday Generator">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>birthday generator</span>
        </a>
        <p className="local-badge">Local MVP · cosmic blue</p>
      </header>

      <section className="generator-hero" aria-labelledby="generator-title">
        <p className="eyebrow">Một file quà, một vũ trụ nhỏ</p>
        <h1 id="generator-title">Tạo thiệp sinh nhật sống động từ ảnh và lời nhắn của bạn.</h1>
        <p>Điền thông tin, xem ảnh chân dung thành ASCII theo thời gian thực, rồi tải về một file HTML tự chứa.</p>
      </section>

      <form id="generator" className="generator-grid" onSubmit={exportGift} noValidate>
        <section className="generator-card input-card" aria-labelledby="details-title">
          <div className="card-heading">
            <p className="eyebrow">01 · Nội dung quà</p>
            <h2 id="details-title">Thông tin người nhận</h2>
          </div>

          <div className="field-grid">
            <label className="field field-full">
              <span>Tên người nhận <b aria-hidden="true">*</b></span>
              <input
                value={values.recipientName}
                onChange={updateValue("recipientName")}
                maxLength={120}
                placeholder="Ví dụ: Phạm Trường Giang"
                aria-invalid={Boolean(errors.recipientName)}
                aria-describedby={errors.recipientName ? "recipient-name-error" : undefined}
              />
              {errors.recipientName && <small id="recipient-name-error" className="field-error">{errors.recipientName}</small>}
            </label>

            <label className="field">
              <span>Ngày sinh <b aria-hidden="true">*</b></span>
              <input
                type="date"
                value={values.birthday}
                onChange={updateValue("birthday")}
                aria-invalid={Boolean(errors.birthday)}
                aria-describedby={errors.birthday ? "birthday-error" : undefined}
              />
              {errors.birthday && <small id="birthday-error" className="field-error">{errors.birthday}</small>}
            </label>

            <div className="theme-field" aria-label="Theme đang dùng">
              <span>Theme</span>
              <div className="theme-choice"><i aria-hidden="true" />cosmic-blue <small>Đã chọn</small></div>
            </div>
          </div>

          <div className="initials-box" aria-live="polite">
            <div>
              <span>Initials tự tạo</span>
              <p>{initials.length ? "Tạo từ từng phần trong họ tên." : "Nhập tên để tạo initials."}</p>
            </div>
            <div className="initials" aria-label={initials.length ? `Initials: ${initials.join(", ")}` : "Chưa có initials"}>
              {initials.length ? initials.map((initial, index) => <i key={`${initial}-${index}`}>{initial}</i>) : <em>✦</em>}
            </div>
          </div>

          <label className="field message-field">
            <span>Lời nhắn <b aria-hidden="true">*</b></span>
            <textarea
              value={values.message}
              onChange={updateValue("message")}
              maxLength={8000}
              rows={7}
              placeholder="Viết lời chúc bạn muốn người nhận đọc trong món quà…"
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? "message-error" : "message-count"}
            />
            <div className="field-meta">
              <small id="message-count">{values.message.length.toLocaleString("vi-VN")}/8.000 ký tự</small>
              {errors.message && <small id="message-error" className="field-error">{errors.message}</small>}
            </div>
          </label>

          <div className="card-heading portrait-heading">
            <p className="eyebrow">02 · Chân dung ASCII</p>
            <h2>Biến ảnh thành những chấm sao</h2>
          </div>

          <label className={`upload-zone ${imageError || errors.portrait ? "has-error" : ""}`}>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={selectPortrait} />
            <span className="upload-icon" aria-hidden="true">↥</span>
            <strong>{imageName || "Chọn ảnh chân dung"}</strong>
            <small>{imageName ? "Ảnh sẽ được crop/fit vào khung chân dung." : "PNG, JPG, WebP hoặc GIF · tối đa 8 MB · mỗi chiều tối đa 6.000 px"}</small>
          </label>
          {(imageError || errors.portrait) && <p className="field-error upload-error" role="status">{imageError || errors.portrait}</p>}
          {imageName && <button className="text-button" type="button" onClick={resetPortrait}>Chọn ảnh khác</button>}

          <fieldset className="ascii-controls" disabled={!imageSource}>
            <legend>Tinh chỉnh ASCII</legend>
            <label>
              <span>Độ chi tiết <output>{settings.columns} cột</output></span>
              <input type="range" min="36" max="120" step="4" value={settings.columns} onChange={updateSetting("columns")} />
            </label>
            <label>
              <span>Độ sáng <output>{settings.brightness > 0 ? "+" : ""}{settings.brightness}</output></span>
              <input type="range" min="-60" max="60" value={settings.brightness} onChange={updateSetting("brightness")} />
            </label>
            <label>
              <span>Tương phản <output>{settings.contrast > 0 ? "+" : ""}{settings.contrast}</output></span>
              <input type="range" min="-60" max="60" value={settings.contrast} onChange={updateSetting("contrast")} />
            </label>
            <div className="toggle-row">
              <label><input type="checkbox" checked={settings.inverted} onChange={updateSetting("inverted")} />Đảo màu</label>
              <label><input type="checkbox" checked={settings.color} onChange={updateSetting("color")} />Màu cơ bản</label>
            </div>
          </fieldset>
        </section>

        <aside className="preview-column" aria-labelledby="preview-title">
          <section className="generator-card ascii-card">
            <div className="card-heading compact-heading">
              <div>
                <p className="eyebrow">Ảnh đã xử lý</p>
                <h2>ASCII portrait</h2>
              </div>
              {isRenderingAscii && <span className="processing">Đang vẽ…</span>}
            </div>
            <div className="ascii-frame"><AsciiPreview portrait={portrait} /></div>
            <p className="ascii-note">Canvas crop/fit ảnh về tỉ lệ chân dung trước khi map theo bảng ký tự <code>@%#*+=-:. </code>.</p>
          </section>

          <section className="generator-card gift-preview-card">
            <div className="card-heading compact-heading">
              <div>
                <p className="eyebrow">03 · Xem trước</p>
                <h2 id="preview-title">Món quà của bạn</h2>
              </div>
              <span className="sandbox-badge">sandboxed</span>
            </div>
            <p className="preview-status" role="status">{previewError || previewStatus}</p>
            <div className="gift-preview-shell">
              {previewHtml ? (
                <iframe
                  title="Xem trước thiệp sinh nhật"
                  srcDoc={previewHtml}
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="preview-empty"><span aria-hidden="true">✦</span><p>Preview sẽ mở khi thông tin hợp lệ và ảnh ASCII đã sẵn sàng.</p></div>
              )}
            </div>
            <div className={`size-meter ${fileSize && fileSize > FILE_SIZE_BUDGET ? "over-budget" : ""}`}>
              <span>Dung lượng dự kiến</span>
              <strong>{fileSize ? fileSizeLabel(fileSize) : "—"}</strong>
              <small>{fileSize && fileSize > FILE_SIZE_BUDGET ? "Vượt ngưỡng khuyến nghị 5 MB." : "Ngưỡng khuyến nghị: 5 MB."}</small>
            </div>
            <button className="export-button" type="submit" disabled={isRenderingAscii || isExporting}>
              {isExporting ? "Đang tạo file…" : "Tải file HTML tự chứa"} <span aria-hidden="true">↓</span>
            </button>
            <p className="export-status" role="status">{exportStatus}</p>
          </section>
        </aside>
      </form>
    </main>
  );
}
