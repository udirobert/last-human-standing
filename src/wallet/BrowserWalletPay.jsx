/**
 * Browser / Farcaster wallet connect + pay component.
 * Supports WLD on World Chain and cUSD/USDC on Celo.
 */
import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { parseUnits } from "viem";
import { celo } from "wagmi/chains";
import {
  WLD_CONTRACT,
  ERC20_TRANSFER_ABI,
  CELO_TOKENS,
  CELO_PRIZE_POOL_ADDRESS,
  getCeloTokenAddress,
} from "./config.js";

const PAYMENT_OPTIONS = [
  { id: "wld", label: "1 WLD", description: "World Chain", chain: "World Chain" },
  { id: "cusd", label: "5 cUSD", description: "Celo stablecoin", chain: "Celo" },
  { id: "usdc", label: "5 USDC", description: "USD Coin on Celo", chain: "Celo" },
];

export default function BrowserWalletPay({ prizePoolAddress, onPaid, referredBy, celoPrizePool }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, data: txHash, isPending: isSending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const chainId = useChainId();

  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedToken, setSelectedToken] = useState("wld");

  const isCeloSelected = selectedToken === "cusd" || selectedToken === "usdc";

  // Once tx confirms, notify server and parent
  if (isConfirmed && !confirmed) {
    setConfirmed(true);
    const endpoint = isCeloSelected ? "/api/pay/browser-celo-confirm" : "/api/pay/browser-confirm";
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address,
        txHash,
        referredBy,
        token: selectedToken,
      }),
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.error || "Backend confirmation failed");
        onPaid?.(address);
      })
      .catch((e) => {
        setConfirmed(false);
        setError(e instanceof Error ? e.message : "Backend confirmation failed");
      });
  }

  const handlePay = () => {
    setError(null);

    if (isCeloSelected) {
      const tokenSymbol = selectedToken === "cusd" ? "cUSD" : "USDC";
      const tokenConfig = CELO_TOKENS[tokenSymbol];
      const tokenAddress = getCeloTokenAddress(tokenSymbol, chainId);
      const prizeAddr = celoPrizePool || CELO_PRIZE_POOL_ADDRESS;
      const amount = selectedToken === "cusd" ? "5" : "5"; // 5 cUSD or 5 USDC

      try {
        writeContract({
          address: tokenAddress,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [prizeAddr, parseUnits(amount, tokenConfig.decimals)],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transaction failed");
      }
    } else {
      try {
        writeContract({
          address: WLD_CONTRACT,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [prizePoolAddress, parseUnits("1", 18)],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transaction failed");
      }
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <p className="text-dim font-mono text-xs text-center">
          Connect any wallet to pay the entry fee on World Chain or Celo
        </p>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isConnecting}
            className="w-full py-3 rounded-xl bg-smoke border border-ember text-bone font-mono text-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            {isConnecting ? "Connecting…" : `Connect ${connector.name}`}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-smoke rounded-xl p-3">
        <span className="text-bone font-mono text-xs truncate">{address}</span>
        <button onClick={() => disconnect()} className="text-dim text-xs underline ml-2">
          Disconnect
        </button>
      </div>

      {confirmed || isConfirmed ? (
        <div className="text-center py-3">
          <p className="text-xl">✅</p>
          <p className="text-bone font-mono text-sm">Payment confirmed!</p>
          <p className="text-dim font-mono text-xs mt-1">
            Spot reserved — verify with World ID or Self Protocol before Day 1 for full trust.
          </p>
        </div>
      ) : (
        <>
          {/* Token selector */}
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedToken(opt.id)}
                className={`py-2.5 rounded-xl font-mono text-xs transition-all ${
                  selectedToken === opt.id
                    ? "bg-blood text-bone border border-blood"
                    : "bg-ash text-dim border border-ember hover:border-blood/40"
                }`}
              >
                <div className="font-bold">{opt.label}</div>
                <div className="text-[9px] opacity-70">{opt.description}</div>
              </button>
            ))}
          </div>

          <button
            onClick={handlePay}
            disabled={isSending || isConfirming}
            className="w-full py-3 rounded-xl bg-blood text-bone font-display text-lg tracking-wide active:scale-95 transition-transform disabled:opacity-50"
          >
            {isSending
              ? "Confirm in wallet…"
              : isConfirming
              ? "Confirming on-chain…"
              : `Pay ${selectedToken === "wld" ? "1 WLD → Reserve" : `5 ${selectedToken.toUpperCase()} → Reserve`} Spot`}
          </button>
        </>
      )}

      {error && (
        <p className="text-blood font-mono text-xs text-center">{error}</p>
      )}

      <p className="text-dim font-mono text-[10px] text-center">
        {isCeloSelected
          ? "Celo payment — verify with Self Protocol for full trust level."
          : "World Chain payment — World ID verification gives you full trust level."}
      </p>
    </div>
  );
}
