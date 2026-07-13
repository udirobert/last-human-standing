import { MiniKit } from "@worldcoin/minikit-js";

/**
 * Trigger native haptic feedback in World App, falling back to
 * navigator.vibrate on unsupported browsers.
 *
 * @param {'success'|'warning'|'error'|'light'|'medium'|'heavy'} kind
 */
export async function haptic(kind) {
  if (MiniKit.isInstalled()) {
    try {
      if (kind === "success" || kind === "warning" || kind === "error") {
        await MiniKit.sendHapticFeedback({ hapticsType: "notification", style: kind });
      } else {
        await MiniKit.sendHapticFeedback({ hapticsType: "impact", style: kind });
      }
      return;
    } catch {
      // Fallback to vibration if MiniKit haptic fails
    }
  }

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const patterns = {
      success: [30, 40, 30, 40, 60],
      warning: [60, 30, 60],
      error: [200],
      light: [20],
      medium: [40],
      heavy: [80],
    };
    navigator.vibrate(patterns[kind] || [30]);
  }
}
