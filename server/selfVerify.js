/**
 * Self Protocol verification helpers.
 * @see https://docs.self.xyz/self-pass-legacy/basic-integration
 *
 * Staging vs mainnet: SELF_MOCK_PASPORT defaults to true for safe launch;
 * flip to false post-launch to verify real passports on Celo mainnet.
 *
 * The /api/self/verify endpoint is PUBLIC (no requireAuth) because Self's
 * relayer POSTs the proof back to us without our session cookie. Security
 * comes from the ZK proof: the verifier recovers a userIdentifier that
 * MUST equal the wallet the user was trying to verify, so a malicious
 * caller can only ever Self-verify their own wallet — which is what the
 * user flow already does.
 */

import { SelfBackendVerifier, AllIds, DefaultConfigStore } from "@selfxyz/core";

export const SELF_SCOPE = process.env.SELF_SCOPE || "last-human-standing";
const SELF_MOCK_PASSPORT = process.env.SELF_MOCK_PASSPORT !== "false";
const SELF_EXCLUDED_COUNTRIES = (process.env.SELF_EXCLUDED_COUNTRIES || "")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);
const SELF_MINIMUM_AGE = Number(process.env.SELF_MINIMUM_AGE || 18);
const SELF_OFAC = process.env.SELF_OFAC !== "false";

let verifierPromise = null;

function getEndpoint() {
  return (
    process.env.SELF_VERIFY_ENDPOINT ||
    process.env.PUBLIC_API_URL ||
    process.env.PUBLIC_BASE_URL ||
    null
  );
}

async function getVerifier() {
  if (process.env.SELF_ENABLED !== "true") return null;
  if (!verifierPromise) {
    verifierPromise = (async () => {
      const endpoint = getEndpoint();
      if (!endpoint) {
        console.warn("self_verify: set SELF_VERIFY_ENDPOINT or PUBLIC_API_URL");
        return null;
      }
      const config = new DefaultConfigStore({
        minimumAge: SELF_MINIMUM_AGE,
        excludedCountries: SELF_EXCLUDED_COUNTRIES,
        ofac: SELF_OFAC,
      });
      return new SelfBackendVerifier(
        SELF_SCOPE,
        endpoint,
        SELF_MOCK_PASSPORT,
        AllIds,
        config,
        "hex",
      );
    })();
  }
  return verifierPromise;
}

/**
 * Verify a Self proof payload. Self's relayer POSTs
 * `{ attestationId, proof, publicSignals, userContextData }` to our
 * endpoint; we pass those through to the verifier, which checks the
 * ZK proof against the on-chain hub and recovers the wallet address
 * from `userData.userIdentifier` (the userId that was encoded into
 * the SelfApp at build time).
 *
 * @param {{
 *   attestationId: number|string,
 *   proof: unknown,
 *   publicSignals: string[],
 *   userContextData?: string,
 * }} payload
 * @returns {Promise<{ ok: boolean, walletAddress?: string, reason?: string, details?: unknown }>}
 */
export async function verifySelfProof(payload) {
  if (process.env.SELF_ENABLED !== "true") {
    return { ok: false, reason: "self_not_enabled" };
  }

  const verifier = await getVerifier();
  if (!verifier) {
    return { ok: false, reason: "self_verifier_unavailable" };
  }

  if (!payload?.attestationId || !payload?.proof || !payload?.publicSignals) {
    return { ok: false, reason: "missing_fields" };
  }

  try {
    const userContextData = typeof payload.userContextData === "string"
      ? payload.userContextData
      : "";
    const result = await verifier.verify(
      payload.attestationId,
      payload.proof,
      payload.publicSignals,
      userContextData,
    );

    const valid = result?.isValidDetails?.isValid;
    if (!valid) {
      return {
        ok: false,
        reason: "proof_invalid",
        details: result?.isValidDetails ?? null,
      };
    }

    const userIdentifier = result?.userData?.userIdentifier;
    if (!userIdentifier) {
      return { ok: false, reason: "missing_user_identifier", details: result };
    }

    return {
      ok: true,
      walletAddress: String(userIdentifier),
      details: result,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    const stack = e instanceof Error ? e.stack : "";
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      event: "self_verify_exception",
      error: msg,
      stack: stack?.split("\n").slice(0, 3).join("|"),
    }));
    return {
      ok: false,
      reason: "verify_exception",
      details: msg,
    };
  }
}
