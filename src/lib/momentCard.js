/**
 * Moment card canvas renderer — mythic share artifacts for
 * survive / jury / win. Draws a 1200×630 PNG that matches the
 * app palette so native share sheets get a real image.
 *
 * Supports an optional photoUrl background: the user's proof
 * becomes the texture of the share card.
 */

export const MOMENT_W = 1200;
export const MOMENT_H = 630;

const C = {
  blood: "#FF1A1A",
  ash: "#0D0D0D",
  smoke: "#1A1A1A",
  ember: "#2A2A2A",
  bone: "#F0EDE8",
  amber: "#FFB800",
  neon: "#00FF94",
  dim: "#888888",
  indigo: "#6366F1",
};

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function drawCoverImage(ctx, img, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawPhotoOverlay(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, MOMENT_H);
  g.addColorStop(0, "rgba(13,13,13,0.45)");
  g.addColorStop(0.5, "rgba(13,13,13,0.65)");
  g.addColorStop(1, "rgba(13,13,13,0.88)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MOMENT_W, MOMENT_H);
}

function paintSolidBackdrop(ctx, accent) {
  const g = ctx.createLinearGradient(0, 0, MOMENT_W, MOMENT_H);
  g.addColorStop(0, C.ash);
  g.addColorStop(1, C.smoke);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MOMENT_W, MOMENT_H);

  const top = ctx.createLinearGradient(0, 0, MOMENT_W, 0);
  top.addColorStop(0, C.blood);
  top.addColorStop(1, accent);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, MOMENT_W, 8);
}

function paintBorder(ctx) {
  ctx.strokeStyle = C.ember;
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 40, MOMENT_W - 80, MOMENT_H - 80, 24);
  ctx.stroke();
}

function paintBrand(ctx) {
  ctx.fillStyle = C.blood;
  ctx.font = "600 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.letterSpacing = "0.35em";
  ctx.fillText("LAST HUMAN STANDING", MOMENT_W / 2, 110);
  ctx.letterSpacing = "0";
}

function paintFooter(ctx, originHost) {
  ctx.fillStyle = C.dim;
  ctx.font = "14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${originHost} · 50 humans. One pot.`, MOMENT_W / 2, 570);
}

function paintStatusPill(ctx, label, color) {
  ctx.fillStyle = "rgba(13,13,13,0.65)";
  roundRect(ctx, 450, 140, 300, 44, 22);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "700 20px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, MOMENT_W / 2, 170);
}

function setTextShadow(ctx) {
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function clearTextShadow(ctx) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
}

/**
 * @param {'survive'|'jury'|'win'} kind
 * @param {{ name?: string, day?: number|string, rank?: number|string, cap?: number|string, originHost?: string, photoUrl?: string }} data
 * @returns {Promise<HTMLCanvasElement|null>}
 */
export async function renderMomentCard(kind, data = {}) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = MOMENT_W;
  canvas.height = MOMENT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const name = data.name || "anon";
  const day = data.day ?? "—";
  const rank = data.rank ?? "—";
  const cap = data.cap ?? "—";
  const originHost = data.originHost || "lasthumanstanding.thisyearnofear.com";
  const accent = kind === "win" ? C.neon : C.amber;

  let photo = null;
  if (data.photoUrl) {
    try {
      photo = await loadImage(data.photoUrl);
    } catch {
      // Fall back to solid backdrop if image fails to load
    }
  }

  if (photo) {
    drawCoverImage(ctx, photo, MOMENT_W, MOMENT_H);
    drawPhotoOverlay(ctx);
  } else {
    paintSolidBackdrop(ctx, accent);
  }

  paintBorder(ctx);
  setTextShadow(ctx);
  paintBrand(ctx);

  if (kind === "survive") {
    paintStatusPill(ctx, "SURVIVED", C.neon);
    ctx.fillStyle = C.bone;
    ctx.font = "700 44px Bebas Neue, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(name).slice(0, 28), MOMENT_W / 2, 250);
    ctx.fillStyle = C.amber;
    ctx.font = "700 96px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(`RANK #${rank}`, MOMENT_W / 2, 370);
    ctx.fillStyle = C.dim;
    ctx.font = "22px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(`Day ${day} · of ${cap} surviving today`, MOMENT_W / 2, 430);
  } else if (kind === "jury") {
    paintStatusPill(ctx, "JURY NOW", C.amber);
    ctx.fillStyle = C.bone;
    ctx.font = "700 44px Bebas Neue, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(name).slice(0, 28), MOMENT_W / 2, 250);
    ctx.fillStyle = C.blood;
    ctx.font = "700 72px Bebas Neue, Impact, sans-serif";
    ctx.fillText("OUT — NOT DONE", MOMENT_W / 2, 350);
    ctx.fillStyle = C.dim;
    ctx.font = "22px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(`Survived ${day} day${Number(day) === 1 ? "" : "s"} · votes decide who stays`, MOMENT_W / 2, 420);
  } else {
    // win
    paintStatusPill(ctx, "LAST HUMAN", C.amber);
    ctx.fillStyle = C.amber;
    ctx.font = "700 52px Bebas Neue, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(name).slice(0, 28), MOMENT_W / 2, 260);
    ctx.fillStyle = C.bone;
    ctx.font = "700 64px Bebas Neue, Impact, sans-serif";
    ctx.fillText("TOOK THE POT", MOMENT_W / 2, 350);
    ctx.fillStyle = C.dim;
    ctx.font = "22px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(`Outlasted the cohort · Day ${day}`, MOMENT_W / 2, 420);
  }

  paintFooter(ctx, originHost);
  clearTextShadow(ctx);
  return canvas;
}

/** @returns {Promise<Blob|null>} */
export function canvasToPngBlob(canvas) {
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
