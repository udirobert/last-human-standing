/**
 * Wagmi + viem config for browser wallet connections.
 * Used when the app runs outside World App (browser demo or Farrcaster mini app).
 */
import { http, createConfig } from "wagmi";
import { worldchain } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const WALLETCONNECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo";

export const wagmiConfig = createConfig({
  chains: [worldchain],
  connectors: [
    injected(),
    ...(WALLETCONNECT_ID !== "demo"
      ? [walletConnect({ projectId: WALLETCONNECT_ID })]
      : []),
  ],
  transports: {
    [worldchain.id]: http(),
  },
});

/**
 * WLD contract address on World Chain.
 * @type {string}
 */
const _WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
export const WLD_CONTRACT = _WLD;

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