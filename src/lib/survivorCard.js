/**
 * Survivor card art — opt-in AI restyle of the player's own proof photo.
 *
 * Downscales the local File client-side (keeps the payload small), asks
 * /api/survivor-card to restyle it via Meshy, polls the task, then signs
 * the cached derivative through the existing /api/media-url endpoint.
 * Returns null on any failure — callers fall back to the raw photo.
 */

const MAX_DIM = 1024;
const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 150_000;

function fileToImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image decode failed")); };
    img.src = url;
  });
}

async function fileToCardDataUrl(file) {
  const img = await fileToImageElement(file);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) return null;
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signMediaUrl(mediaPath) {
  const resp = await fetch("/api/media-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ path: mediaPath }),
  });
  const json = await resp.json().catch(() => ({}));
  return resp.ok && json.url ? json.url : null;
}

/**
 * @param {File} file — the player's proof photo
 * @returns {Promise<string|null>} signed URL of the styled card art, or null
 */
export async function getSurvivorCardPhotoUrl(file) {
  try {
    const dataUrl = await fileToCardDataUrl(file);
    if (!dataUrl) return null;

    const createResp = await fetch("/api/survivor-card", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ image: dataUrl }),
    });
    const created = await createResp.json().catch(() => ({}));
    if (!createResp.ok || !created.ok) return null;

    let mediaPath = created.mediaPath || null;
    if (!mediaPath && created.taskId) {
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await sleep(POLL_MS);
        const pollResp = await fetch(`/api/survivor-card/${encodeURIComponent(created.taskId)}`, {
          credentials: "include",
        });
        const poll = await pollResp.json().catch(() => ({}));
        if (poll.status === "done" && poll.mediaPath) {
          mediaPath = poll.mediaPath;
          break;
        }
        if (poll.status === "failed" || !pollResp.ok) return null;
      }
    }
    if (!mediaPath) return null;
    return await signMediaUrl(mediaPath);
  } catch {
    return null;
  }
}
