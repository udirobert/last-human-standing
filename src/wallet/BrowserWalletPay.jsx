/**
 * Browser / Farcaster wallet connect + pay component.
 * Allows non-World-App users to connect any EVM wallet and pay the 1 WLD entry fee.
 */
import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { WLD_CONTRACT, ERC20_TRANSFER_ABI } from "./config.js";

export default function BrowserWalletPay({ prizePoolAddress, onPaid, referredBy }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, data: txHash, isPending: isSending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  // Once tx confirms, notify server and parent
  if (isConfirmed && !confirmed) {
    setConfirmed(true);
    fetch("/api/pay/browser-confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, txHash, referredBy }),
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
  };

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <p className="text-dim font-mono text-xs text-center">
          Connect any wallet to pay the 1 WLD entry fee on World Chain
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
          <p className="text-dim font-mono text-xs mt-1">Spot reserved — verify with World ID before Day 1 for full trust.</p>
        </div>
      ) : (
        <button
          onClick={handlePay}
          disabled={isSending || isConfirming}
          className="w-full py-3 rounded-xl bg-blood text-bone font-display text-lg tracking-wide active:scale-95 transition-transform disabled:opacity-50"
        >
          {isSending ? "Confirm in wallet…" : isConfirming ? "Confirming on-chain…" : "Pay 1 WLD → Reserve Spot"}
        </button>
      )}

      {error && (
        <p className="text-blood font-mono text-xs text-center">{error}</p>
      )}

      <p className="text-dim font-mono text-[10px] text-center">
        Unverified spot — World ID verification gives you full trust level
      </p>
    </div>
  );
}
