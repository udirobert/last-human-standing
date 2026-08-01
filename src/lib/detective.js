/**
 * Shared detective ladder for Feed accuracy strip + PersonalShelf.
 * Thresholds match the vote-accuracy craft path (resolved count + accuracy).
 */
export function getDetectiveTitle(resolved = 0, accuracy = null) {
  const n = Number(resolved) || 0;
  if (n < 5) return "Rookie Juror";
  const acc = accuracy ?? 0;
  if (n >= 20 && acc >= 0.9) return "Sherlock";
  if (n >= 10 && acc >= 0.8) return "Bloodhound";
  if (n >= 10) return "Seasoned Juror";
  if (n >= 5) return "Junior Detective";
  return "Rookie Juror";
}
