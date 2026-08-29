import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useServiceWorkerUpdate — surfaces when a new service-worker version takes
 * control, so the UI can prompt "App updated — tap to refresh" instead of
 * silently serving a mix of old/new assets.
 *
 * Only reacts if a controller already existed at mount (i.e. this is a true
 * in-place update). The very first install (no prior controller) doesn't
 * fire the prompt — there's nothing stale to refresh yet.
 *
 * Pairs with main.jsx's SW registration, which posts SKIP_WAITING on a new
 * install so the new worker activates and the page gets `controllerchange`.
 *
 * @returns {{
 *   updateReady: boolean,
 *   dismiss: () => void,
 *   refresh: () => void,
 * }}
 */
export function useServiceWorkerUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  // Whether a controller was already present at mount (true in-place update).
  const hadControllerRef = useRef(
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    Boolean(navigator.serviceWorker.controller),
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return undefined;
    }
    const onControllerChange = () => {
      // Only prompt when we're switching away from an old controller.
      if (hadControllerRef.current) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const dismiss = useCallback(() => setUpdateReady(false), []);
  const refresh = useCallback(() => {
    try {
      navigator.serviceWorker?.getRegistration()?.then((reg) => reg?.active?.postMessage?.({ type: "SKIP_WAITING" }));
    } catch {
      /* best effort */
    }
    window.location.reload();
  }, []);

  return { updateReady, dismiss, refresh };
}

export default useServiceWorkerUpdate;