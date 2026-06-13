// Single source of truth for build-time env reads.
// Importing this module in test/runtime lets us swap to a runtime config
// in one place if we ever migrate off Vite.
export function isFreeEntryMode() {
  return import.meta.env.VITE_FREE_ENTRY_MODE === "true";
}

export function entryFeeWld() {
  const raw = import.meta.env.VITE_ENTRY_FEE_WLD;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function isHumanityVerificationEnabled() {
  return Boolean(import.meta.env.VITE_ENABLE_IDKIT) || Boolean(import.meta.env.VITE_ENABLE_SELF);
}
