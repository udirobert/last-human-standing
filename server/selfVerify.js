/**
 * Self Protocol verification helpers.
 * @see https://docs.self.xyz/self-pass/basic-integration
 */

const SELF_SCOPE = process.env.SELF_SCOPE || "last-human-standing";
const SELF_MOCK_PASSPORT = process.env.SELF_MOCK_PASSPORT !== "false";

let verifierPromise = null;

async function getVerifier() {
  if (process.env.SELF_ENABLED !== "true") return null;
  if (!verifierPromise) {
    verifierPromise = (async () => {
      try {
        const { SelfBackendVerifier } = await import("@selfxyz/core");
        const endpoint = process.env.SELF_VERIFY_ENDPOINT || process.env.PUBLIC_API_URL;
        if (!endpoint) {
          console.warn("self_verify: set SELF_VERIFY_ENDPOINT or PUBLIC_API_URL");
          return null;
        }
        return new SelfBackendVerifier({
          scope: SELF_SCOPE,
          endpoint,
          mockPassport: SELF_MOCK_PASSPORT,
          allowedIds: ["PASSPORT", "ID_CARD"],
          userIdentifierType: "hex",
        });
      } catch (e) {
        console.warn("self_verify: @selfxyz/core not available", e?.message);
        return null;
      }
    })();
  }
  return verifierPromise;
}

/**
 * @param {object} payload - Self proof payload from client / relayer
 * @param {string} userAddress - Wallet address (hex)
 * @returns {Promise<{ ok: boolean, nullifier?: string, reason?: string, details?: unknown }>}
 */
export async function verifySelfProof(payload, userAddress) {
  if (process.env.SELF_ENABLED !== "true") {
    return { ok: false, reason: "self_not_enabled" };
  }

  const verifier = await getVerifier();
  if (!verifier) {
    return { ok: false, reason: "self_verifier_unavailable" };
  }

  try {
    const result = await verifier.verify(
      payload.attestationId,
      payload.proof,
      payload.publicSignals,
      userAddress,
    );

    if (!result?.isValid) {
      return { ok: false, reason: "proof_invalid", details: result };
    }

    const nullifier =
      payload.nullifier ||
      result?.userIdentifier ||
      result?.nullifierHash ||
      null;

    if (!nullifier) {
      return { ok: false, reason: "missing_nullifier", details: result };
    }

    return { ok: true, nullifier: String(nullifier), details: result };
  } catch (e) {
    return {
      ok: false,
      reason: "verify_exception",
      details: e instanceof Error ? e.message : "unknown_error",
    };
  }
}

export { SELF_SCOPE };
