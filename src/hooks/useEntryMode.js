import { useMemo } from "react";
import { isFreeEntryMode, entryFeeWld } from "../lib/env.js";

/**
 * Single source of truth for the entry-fee mode and amount.
 * Replaces inline reads of VITE_FREE_ENTRY_MODE / VITE_ENTRY_FEE_WLD
 * across Onboarding, BrowserWalletPay, etc.
 */
export function useEntryMode() {
  return useMemo(
    () => ({
      isFree: isFreeEntryMode(),
      feeWld: entryFeeWld(),
    }),
    [],
  );
}
