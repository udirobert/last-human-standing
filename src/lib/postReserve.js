export const WELCOME_KEY = "lhs_just_reserved";

/** Call after a successful reserve/pay before routing to the lobby. */
export function markJustReserved() {
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Confirmation-step hold. While set, App's "reserved → lobby" shortcut
 * stands down so the new player can see the confirmation screen
 * (countdown, reminders, invite) before entering the lobby.
 */
export function markConfirming() {
  try {
    sessionStorage.setItem("lhs_confirming", "1");
  } catch {
    /* ignore */
  }
}

export function clearConfirming() {
  try {
    sessionStorage.removeItem("lhs_confirming");
  } catch {
    /* ignore */
  }
}

export function isConfirming() {
  try {
    return sessionStorage.getItem("lhs_confirming") === "1";
  } catch {
    return false;
  }
}
