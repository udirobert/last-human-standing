export const WELCOME_KEY = "lhs_just_reserved";

/** Call after a successful reserve/pay before routing to the lobby. */
export function markJustReserved() {
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* ignore */
  }
}
