/**
 * Client-side Sentry initialization.
 * Imported first in main.jsx so it captures errors during app boot.
 *
 * SENTRY_DSN is set at build time via VITE_SENTRY_DSN.
 * If unset, Sentry is a no-op (dev/test mode).
 */
import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PROD = import.meta.env.MODE === "production";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_PROD ? "production" : import.meta.env.MODE,
    enabled: Boolean(SENTRY_DSN),
    tracesSampleRate: IS_PROD ? 0.1 : 1.0,
    // Don't send PII
    sendDefaultPii: false,
    // Ignore common browser extensions / network noise
    ignoreErrors: [
      // Browser extension injected scripts
      "top.GLOBALS",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Network errors the user can't act on
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      // Cancelled navigations
      "AbortError",
    ],
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}

export { Sentry };
