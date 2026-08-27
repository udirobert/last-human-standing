import { useParallax } from "../../hooks/ParallaxContext.jsx";

/**
 * ParallaxPermissionChip — the gesture-tied iOS orientation permission prompt.
 *
 * iOS 13+ requires DeviceOrientationEvent.requestPermission() to be called
 * from a user gesture. The parallax hook cannot auto-request (there is no
 * gesture at mount), so without this chip `?parallax=1` on iPhone was a
 * silent no-op — the review finding this fixes.
 *
 * Renders only when permissionState is "needed" (iOS, not yet requested).
 * On tap it requests permission; granted → the orientation stream takes
 * over and the chip unmounts; denied → the chip unmounts and parallax
 * stays off (honest, no retry nudge). On desktop/Android the permission
 * API does not exist, permissionState is "none", and nothing renders.
 * Under prefers-reduced-motion the hook never asks, so nothing renders.
 */
export default function ParallaxPermissionChip() {
  const ctx = useParallax();
  if (!ctx || ctx.permissionState !== "needed") return null;

  return (
    <button
      type="button"
      onClick={() => ctx.requestOrientationPermission()}
      className="pointer-events-auto absolute right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-20 flex min-h-[44px] items-center gap-2 rounded-full border border-ember/60 bg-smoke/80 px-4 font-mono text-[10px] uppercase tracking-widest text-dim backdrop-blur-sm transition-colors hover:border-amber/60 hover:text-bone active:scale-95"
      aria-label="Enable tilt parallax for the backdrop (uses the device motion sensor)"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber/70" aria-hidden="true" />
      Enable tilt
    </button>
  );
}
