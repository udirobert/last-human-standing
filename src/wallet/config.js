/**
 * Wagmi + viem config for browser wallet connections.
 * Used when the app runs outside World App (browser demo or Farcaster mini app).
 * Supports World Chain (WLD) and Celo (cUSD/USDC).
 */
import { http, createConfig } from "wagmi";
import { worldchain, celo, celoAlfajores } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const WALLETCONNECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo";

const useCeloTestnet = import.meta.env.VITE_USE_CELO_TESTNET === "true";
const browserChains = useCeloTestnet ? [worldchain, celoAlfajores] : [worldchain, celo];

export const wagmiConfig = createConfig({
  chains: browserChains,
  connectors: [
    injected(),
    ...(WALLETCONNECT_ID !== "demo"
      ? [walletConnect({ projectId: WALLETCONNECT_ID })]
      : []),
  ],
  transports: {
    [worldchain.id]: http(),
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});

// ─── Token addresses ────────────────────────────────────────────────────

/** WLD contract address on World Chain */
const _WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
export const WLD_CONTRACT = _WLD;

/** cUSD (Celo Dollar) addresses */
export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898E8B2a1cF";
const _CUSD_ALFAJORES = "0x874069Fa1EB16D44d622F2e0Ca25eeA172369bC1";

/** USDC (native) on Celo mainnet */
export const USDC_CELO_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";

/** Prize pool addresses for Celo-side payments. Set via env vars. */
export const CELO_PRIZE_POOL_ADDRESS =
  import.meta.env.VITE_CELO_PRIZE_POOL_ADDRESS || "0x0000000000000000000000000000000000000000";

/** Standard ERC-20 transfer ABI fragment */
export const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

/**
 * Celo token config map — used by payment flows to pick the right
 * contract address per token symbol.
 */
export const CELO_TOKENS = {
  cUSD: {
    name: "Celo Dollar",
    symbol: "cUSD",
    decimals: 18,
    addresses: {
      [celo.id]: CUSD_ADDRESS,
      [celoAlfajores.id]: _CUSD_ALFAJORES,
    },
  },
  USDC: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    addresses: {
      [celo.id]: USDC_CELO_ADDRESS,
      [celoAlfajores.id]: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
    },
  },
};

/**
 * Returns the Celo token address for the given chain ID.
 * @param {string} symbol - "cUSD" or "USDC"
 * @param {number} chainId - wagmi chain ID
 * @returns {string}
 */
export function getCeloTokenAddress(symbol, chainId) {
  const token = CELO_TOKENS[symbol];
  if (!token) throw new Error(`Unknown Celo token: ${symbol}`);
  return token.addresses[chainId] || token.addresses[celo.id];
}