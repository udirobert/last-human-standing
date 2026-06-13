/**
 * Celo balance fetchers for the prize pot.
 *
 * The Celo prize pool is a plain EOA that holds:
 *   - native CELO (gas token)
 *   - cUSD (Celo Dollar, 18 decimals)
 *   - USDC (native, 6 decimals)
 *
 * We expose all three so the UI can show a single "Celo pot" with
 * the stable balance as the headline number, plus the explorer
 * link for verifiability.
 *
 * RPC: defaults to Forno (Celo Foundation's public endpoint). The
 * `CELO_RPC` env var overrides it for higher rate limits.
 */

const DEFAULT_CELO_RPC = "https://forno.celo.org";

const CELO_TOKENS = {
  cUSD: {
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 18,
  },
  USDC: {
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    decimals: 6,
  },
};

const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";

function rpcUrl() {
  return process.env.CELO_RPC || DEFAULT_CELO_RPC;
}

async function ethCall(to, data) {
  const resp = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
    signal: AbortSignal.timeout(5000),
  });
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message || "celo_rpc_error");
  return json.result;
}

async function ethGetBalance(address) {
  const resp = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
    signal: AbortSignal.timeout(5000),
  });
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message || "celo_rpc_error");
  return json.result;
}

async function cusdBalance(holderAddress) {
  const padded = holderAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const data = ERC20_BALANCE_OF_SELECTOR + padded;
  const result = await ethCall(CELO_TOKENS.cUSD.address, data);
  if (!result || result === "0x") return 0;
  return Number(BigInt(result)) / 10 ** CELO_TOKENS.cUSD.decimals;
}

async function usdcBalance(holderAddress) {
  const padded = holderAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const data = ERC20_BALANCE_OF_SELECTOR + padded;
  const result = await ethCall(CELO_TOKENS.USDC.address, data);
  if (!result || result === "0x") return 0;
  return Number(BigInt(result)) / 10 ** CELO_TOKENS.USDC.decimals;
}

async function celoBalance(holderAddress) {
  const hexWei = await ethGetBalance(holderAddress);
  if (!hexWei || hexWei === "0x") return 0;
  return Number(BigInt(hexWei)) / 1e18;
}

/**
 * Debug: raw balanceOf calls against each token contract. Useful
 * for diagnosing why the UI shows "—" when the explorer shows
 * a real balance.
 */
export async function debugCeloBalances(address) {
  const tokens = ["cUSD", "USDC", "CELO"];
  const out = { address, results: {} };
  for (const t of tokens) {
    try {
      const padded = address.replace("0x", "").toLowerCase().padStart(64, "0");
      const data = t === "CELO"
        ? null
        : ERC20_BALANCE_OF_SELECTOR + padded;
      const result = t === "CELO"
        ? await ethGetBalance(address)
        : await ethCall(CELO_TOKENS[t === "cUSD" ? "cUSD" : "USDC"].address, data);
      out.results[t] = {
        contract: t === "CELO" ? null : CELO_TOKENS[t === "cUSD" ? "cUSD" : "USDC"].address,
        raw: result,
        decimal: t === "CELO" ? 18 : (t === "cUSD" ? 18 : 6),
        balance: result && result !== "0x"
          ? Number(BigInt(result)) / 10 ** (t === "CELO" ? 18 : (t === "cUSD" ? 18 : 6))
          : 0,
        ok: !!(result && result !== "0x"),
      };
    } catch (e) {
      out.results[t] = { error: String(e?.message ?? e), ok: false };
    }
  }
  return out;
}

/**
 * Fetch every balance component for a Celo address. Returns a
 * single object with the stable (cUSD+USDC) headline + the
 * component breakdown + the native CELO balance. The component
 * fields are zero when the RPC is unreachable.
 */
export async function fetchCeloPot(address) {
  if (!address) {
    return { celo: 0, cusd: 0, usdc: 0, stable: 0, address: null, explorerUrl: null };
  }
  let celo = 0, cusd = 0, usdc = 0;
  try {
    [celo, cusd, usdc] = await Promise.all([
      celoBalance(address).catch(() => 0),
      cusdBalance(address).catch(() => 0),
      usdcBalance(address).catch(() => 0),
    ]);
  } catch {
    // swallow — the cache will retain its last good value
  }
  return {
    celo,
    cusd,
    usdc,
    stable: cusd + usdc,
    address,
    explorerUrl: `https://celoscan.io/address/${address}`,
  };
}
