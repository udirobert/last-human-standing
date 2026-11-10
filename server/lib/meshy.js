/**
 * Meshy AI REST client — server-side only.
 *
 * Used by /api/survivor-card to restyle a player's opted-in proof photo
 * into house-style share art. Never expose MESHY_API_KEY to the client.
 * Docs: https://docs.meshy.ai/en/api/image-to-image
 */

const MESHY_BASE = "https://api.meshy.ai/openapi/v1";
const MESHY_MODEL = "nano-banana-2"; // 6 credits per restyle
const MESHY_LITE_MODEL = "nano-banana-2-lite"; // 3 credits — catalog plates etc.

export const SURVIVOR_CARD_PROMPT =
  "Restyle this photo as a bold gouache storybook illustration for a mythic survival game called 'Last Human Standing'. " +
  "Keep the person's face, pose and composition recognizable, but render in painterly gouache textures, " +
  "deep navy and warm amber palette, dramatic cinematic rim lighting, subtle film grain, mythic fairytale-storybook mood. No text.";

export function meshyConfigured() {
  return Boolean(process.env.MESHY_API_KEY);
}

async function meshyFetch(path, options = {}) {
  const res = await fetch(`${MESHY_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const err = new Error(json?.message || `meshy ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/** Create an image-to-image task. imageDataUrl must be a data: URI. */
export async function createSurvivorCardTask(imageDataUrl) {
  const json = await meshyFetch("/image-to-image", {
    method: "POST",
    body: JSON.stringify({
      ai_model: MESHY_MODEL,
      prompt: SURVIVOR_CARD_PROMPT,
      reference_image_urls: [imageDataUrl],
    }),
  });
  return json.result; // task id
}

/** Poll a task once. Returns { status, imageUrl? }. */
export async function getSurvivorCardTask(taskId) {
  const json = await meshyFetch(`/image-to-image/${encodeURIComponent(taskId)}`);
  const status = String(json.status || "").toUpperCase();
  const imageUrl = Array.isArray(json.image_urls) ? json.image_urls[0] : null;
  return { status, imageUrl, raw: json };
}

/** Create a text-to-image task. Returns the Meshy task id. */
export async function createTextToImageTask(prompt, { model = MESHY_LITE_MODEL, aspectRatio = "1:1" } = {}) {
  const json = await meshyFetch("/text-to-image", {
    method: "POST",
    body: JSON.stringify({ ai_model: model, prompt, aspect_ratio: aspectRatio }),
  });
  return json.result || json.task_id || json.id;
}

/** Poll a text-to-image task once. Returns { status, imageUrl? }. */
export async function getTextToImageTask(taskId) {
  const json = await meshyFetch(`/text-to-image/${encodeURIComponent(taskId)}`);
  const status = String(json.status || "").toUpperCase();
  const imageUrl = Array.isArray(json.image_urls) ? json.image_urls[0] : (json.image_url || null);
  return { status, imageUrl, raw: json };
}

/** Download a Meshy-hosted result image. */
export async function downloadMeshyImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`meshy download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 20 * 1024 * 1024) throw new Error("meshy image too large");
  return buf;
}
