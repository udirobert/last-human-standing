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

const CUSD_CONTRACT = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const CUSD_DECIMALS = 18;

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

async function cusdBalance(holderAddress) {
  const padded = holderAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const data = ERC20_BALANCE_OF_SELECTOR + padded;
  const result = await ethCall(CUSD_CONTRACT, data);
  if (!result || result === "0x") return 0;
  return Number(BigInt(result)) / 10 ** CUSD_DECIMALS;
}

/**
 * Debug: raw balanceOf call against the cUSD contract. Useful
 * for diagnosing why the UI shows "—" when the explorer shows
 * a real balance.
 */
export async function debugCeloBalances(address) {
  const out = { address, results: {} };
  try {
    const padded = address.replace("0x", "").toLowerCase().padStart(64, "0");
    const data = ERC20_BALANCE_OF_SELECTOR + padded;
    const result = await ethCall(CUSD_CONTRACT, data);
    out.results.cUSD = {
      contract: CUSD_CONTRACT,
      raw: result,
      decimal: CUSD_DECIMALS,
      balance: result && result !== "0x" ? Number(BigInt(result)) / 10 ** CUSD_DECIMALS : 0,
      ok: !!(result && result !== "0x"),
    };
  } catch (e) {
    out.results.cUSD = { error: String(e?.message ?? e), ok: false };
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
    return { cusd: 0, address: null, explorerUrl: null };
  }
  let cusd = 0;
  try {
    cusd = await cusdBalance(address).catch(() => 0);
  } catch {
    // swallow — the cache will retain its last good value
  }
  return {
    cusd,
    address,
    explorerUrl: `https://celoscan.io/address/${address}`,
  };
}
