/**
 * Pluggable proof-of-humanity providers.
 * World ID is live; Self (Celo ecosystem) is planned — see docs/HUMANITY_PROVIDERS.md.
 */

export const HUMANITY_PROVIDERS = {
  world: {
    id: "world",
    label: "World ID",
    chain: "World Chain",
    status: "live",
    docsUrl: "https://docs.world.org/world-id",
    verifyEnv: "VITE_ENABLE_IDKIT",
  },
  self: {
    id: "self",
    label: "Self Protocol",
    chain: "Celo (+ multi-chain)",
    status: "live",
    docsUrl: "https://docs.self.xyz/self-pass/self-pass",
    verifyEnv: "VITE_ENABLE_SELF",
  },
};

export const ENTRY_FEE_WLD = 1;

export function getLiveHumanityProviders() {
  return Object.values(HUMANITY_PROVIDERS).filter((p) => p.status === "live");
}

export function isProviderEnabled(provider) {
  if (provider.status !== "live") return false;
  const envKey = provider.verifyEnv;
  if (!envKey) return true;
  return import.meta.env[envKey] === "true";
}
