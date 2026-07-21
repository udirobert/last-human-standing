/**
 * SHA-256 of raw photo bytes — sent with check-in for server-side dedup.
 */
export async function hashPhotoFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
