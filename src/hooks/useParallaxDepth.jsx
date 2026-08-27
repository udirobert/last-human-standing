import { useEffect, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js";
import {
  isRealOrientationEvent,
  orientationToShift,
  mouseToShift,
} from "../lib/parallaxMath.js";

/**
 * useParallaxDepth — a continuous viewpoint-shift signal for the backdrop.
 *
 * Borrowed from Lattice's camera principle: depth is a function of viewpoint
 * shift, and the camera has no clock of its own — it's driven by input. Here
 * the "camera" is a pair of MotionValues (x, y in px) that ParallaxLayer
 * scales per-depth. No CSS custom properties, no calc() strings, no rAF loop.
 *
 * Inputs, in priority order:
 *   1. Device orientation (beta/gamma) on sensor-equipped devices. iOS 13+
 *      requires a permission request tied to a user gesture — call
 *      requestOrientationPermission() from a tap handler.
 *   2. Mouse position as a fallback (desktop, and any device whose
 *      orientation events never carry real data).
 *
 * BUGS FIXED vs. the original proposal:
 *   - Desktop Chrome has DeviceOrientationEvent as a constructor but no real
 *     sensor, so events arrive with alpha==null. The proposal's hasSensor
 *     check treated the constructor's existence as "has sensor" and skipped
 *     the mouse fallback — desktop Chrome got NO parallax. Here the mouse
 *     listener is ALWAYS installed; a device stream only takes over once a
 *     real event (non-null alpha) arrives, and releases back to mouse if no
 *     real event arrives within SENSOR_TIMEOUT_MS.
 *   - prefers-reduced-motion: respected — no listeners, MotionValues stay 0.
 *   - "0 rAF loops": the proposal ran a permanent rAF re-setting CSS vars.
 *     Here MotionValues are .set() directly on input events, throttled with a
 *     single on-demand rAF flag that is only scheduled while a pending update
 *     exists — no continuous loop when idle.
 */

const SENSOR_TIMEOUT_MS = 2000;

export function useParallaxDepth(enabled = true) {
  const reduce = usePrefersReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [hasSensor, setHasSensor] = useState(false);
  const [permissionState, setPermissionState] = useState(null);

  // Refs shared across listeners (avoid re-subscribing on every state change).
  const lastDeviceAtRef = useRef(0);
  const rafScheduledRef = useRef(false);
  const pendingRef = useRef({ x: 0, y: 0 });

  const apply = () => {
    rafScheduledRef.current = false;
    x.set(pendingRef.current.x);
    y.set(pendingRef.current.y);
  };
  const scheduleApply = () => {
    if (rafScheduledRef.current) return;
    rafScheduledRef.current = true;
    requestAnimationFrame(apply);
  };

  useEffect(() => {
    if (!enabled || reduce) return undefined;
    if (typeof window === "undefined") return undefined;

    // Mouse fallback — always installed. Maps pointer to ±MAX_SHIFT_PX.
    // Only applies when no real device stream is active.
    const onMouseMove = (e) => {
      if (lastDeviceAtRef.current && Date.now() - lastDeviceAtRef.current < SENSOR_TIMEOUT_MS) {
        return;
      }
      pendingRef.current = mouseToShift(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      scheduleApply();
    };
    window.addEventListener("mousemove", onMouseMove);

    // Device orientation — only meaningful if it yields real data. iOS 13+
    // needs permission; we don't auto-request (no user gesture here).
    const supportsDeviceOrientation =
      typeof window.DeviceOrientationEvent === "function" ||
      typeof window.DeviceOrientationEvent === "object";

    let onDevice;
    if (supportsDeviceOrientation) {
      if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
        setPermissionState("needed");
      } else {
        setPermissionState("none");
      }
      onDevice = (e) => {
        // Desktop Chrome fires these with null values — ignore so the mouse
        // fallback keeps working. Only a real sensor takes over.
        if (!isRealOrientationEvent(e)) return;
        lastDeviceAtRef.current = Date.now();
        if (!hasSensor) setHasSensor(true);
        pendingRef.current = orientationToShift(e.gamma, e.beta);
        scheduleApply();
      };
      window.addEventListener("deviceorientation", onDevice);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (onDevice) window.removeEventListener("deviceorientation", onDevice);
    };
    // hasSensor intentionally omitted: including it would rebuild listeners
    // on the first real event. The ref guard makes setState idempotent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reduce]);

  const requestOrientationPermission = async () => {
    if (typeof window === "undefined" || !window.DeviceOrientationEvent) return false;
    if (typeof window.DeviceOrientationEvent.requestPermission !== "function") {
      setPermissionState("granted");
      return true;
    }
    try {
      const perm = await window.DeviceOrientationEvent.requestPermission();
      const ok = perm === "granted";
      setPermissionState(ok ? "granted" : "denied");
      return ok;
    } catch {
      setPermissionState("denied");
      return false;
    }
  };

  return { x, y, hasSensor, permissionState, requestOrientationPermission };
}

export default useParallaxDepth;
