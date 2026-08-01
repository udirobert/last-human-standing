/**
 * Last check-in proof thumb for the personal shelf.
 * Prefers a small JPEG data URL in localStorage (survives reload for the day);
 * falls back to sessionStorage for same-tab blob previews.
 */
export const CHECKIN_PREVIEW_KEY = "lhs_last_checkin_preview";
const THUMB_MAX = 120;
const THUMB_QUALITY = 0.72;

function writeSession(dataUrl) {
  try {
    sessionStorage.setItem(CHECKIN_PREVIEW_KEY, dataUrl);
  } catch {
    /* quota / private mode */
  }
}

function writeLocal(payload) {
  try {
    localStorage.setItem(CHECKIN_PREVIEW_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — session still holds the thumb */
  }
}

function readLocal() {
  try {
    const raw = localStorage.getItem(CHECKIN_PREVIEW_KEY);
    if (!raw) return null;
    if (raw.startsWith("data:")) return { day: null, dataUrl: raw };
    const parsed = JSON.parse(raw);
    if (parsed?.dataUrl) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

async function toThumbDataUrl(source) {
  if (!source || typeof source !== "string") return null;
  if (source.startsWith("data:image/")) {
    // Already a data URL — still downscale if huge.
    if (source.length < 40_000) return source;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, THUMB_MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(source.startsWith("data:") ? source : null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", THUMB_QUALITY));
      } catch {
        resolve(source.startsWith("data:") ? source : null);
      }
    };
    img.onerror = () => resolve(source.startsWith("data:") ? source : null);
    img.src = source;
  });
}

/**
 * Persist a proof thumb. Accepts blob: or data: URLs; stores a compact JPEG.
 * @param {string} source
 * @param {{ day?: number|string|null }} [opts]
 */
export async function saveCheckinPreview(source, { day = null } = {}) {
  if (!source || typeof source !== "string") return;
  writeSession(source);
  const dataUrl = await toThumbDataUrl(source);
  if (!dataUrl) return;
  writeSession(dataUrl);
  writeLocal({
    day: day != null ? Number(day) : null,
    dataUrl,
    savedAt: Date.now(),
  });
}

/**
 * @param {{ day?: number|string|null }} [opts] — when set, only return today's thumb
 * @returns {string|null} data URL or session blob URL
 */
export function readCheckinPreview({ day } = {}) {
  const stored = readLocal();
  if (stored?.dataUrl) {
    if (day == null || stored.day == null || Number(stored.day) === Number(day)) {
      return stored.dataUrl;
    }
  }
  try {
    return sessionStorage.getItem(CHECKIN_PREVIEW_KEY);
  } catch {
    return null;
  }
}
