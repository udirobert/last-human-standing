/**
 * Browser / Farcaster wallet connect + pay.
 * Wallet list lives in a modal — never dumped into the page.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { parseUnits } from "viem";
import {
  WLD_CONTRACT,
  ERC20_TRANSFER_ABI,
  CELO_TOKENS,
  CELO_PRIZE_POOL_ADDRESS,
  getCeloTokenAddress,
} from "./config.js";
import { HumanCta, GhostLink } from "../components/ui/CraftCta.jsx";
import { CUE_PRESS } from "../lib/cuelume.js";

const PAYMENT_OPTIONS = [
  { id: "wld", label: "1 WLD", description: "World Chain" },
  { id: "cusd", label: "5 cUSD", description: "Celo" },
];

function WalletModal({ open, onClose, connectors, onConnect, isConnecting }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 overflow-y-auto overscroll-y-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-ash/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.12 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-ember/40 p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)] max-h-[85vh] overflow-y-auto overscroll-y-contain my-auto"
            style={{
              background: "radial-gradient(120% 90% at 50% 0%, #3a281c 0%, #1a1410 70%, #12100e 100%)",
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <p id="wallet-modal-title" className="font-display text-2xl text-bone leading-tight">
                  Connect a wallet
                </p>
                <p className="font-body text-bone/60 text-sm mt-1">
                  Pick one to pay your entry. Your fee goes straight to the pot.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                {...CUE_PRESS}
                className="w-9 h-9 rounded-full bg-smoke/70 border border-ember/40 text-bone/70 hover:text-bone flex items-center justify-center font-display text-lg leading-none shrink-0"
                aria-label="Close wallet list"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
              {connectors.length === 0 && (
                <p className="text-dim font-mono text-xs text-center py-4">
                  No browser wallets detected. Install one, then refresh.
                </p>
              )}
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  disabled={isConnecting}
                  onClick={() => onConnect(connector)}
                  {...CUE_PRESS}
                  className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl bg-smoke/80 border border-ember/40 text-left hover:border-amber/50 active:scale-[0.98] transition-[transform,border-color,opacity] disabled:opacity-50"
                >
                  {connector.icon ? (
                    <img src={connector.icon} alt="" className="w-8 h-8 rounded-lg" />
                  ) : (
                    <span className="w-8 h-8 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center font-mono text-amber text-xs">
                      {connector.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="flex-1 font-body font-semibold text-bone text-sm">
                    {connector.name}
                  </span>
                  <span className="font-mono text-dim text-[10px] uppercase tracking-wider">
                    {isConnecting ? "…" : "Select"}
                  </span>
                </button>
              ))}
            </div>

            <GhostLink onClick={onClose} className="mt-4 w-full text-center block">
              Cancel
            </GhostLink>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

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
  const [walletOpen, setWalletOpen] = useState(false);

  const isCeloSelected = selectedToken === "cusd" || selectedToken === "usdc";

  useEffect(() => {
    if (isConnected) setWalletOpen(false);
  }, [isConnected]);

  useEffect(() => {
    if (!walletOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setWalletOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walletOpen]);

  // Once tx confirms, notify server and parent
  if (isConfirmed && !confirmed) {
    setConfirmed(true);
    const endpoint = isCeloSelected ? "/api/pay/browser-celo-confirm" : "/api/pay/browser-confirm";
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
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
      const tokenConfig = CELO_TOKENS.cUSD;
      const tokenAddress = getCeloTokenAddress("cUSD", chainId);
      const prizeAddr = celoPrizePool || CELO_PRIZE_POOL_ADDRESS;
      const amount = "5";

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

  const tokenPicker = (
    <div className="grid grid-cols-2 gap-2">
      {PAYMENT_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setSelectedToken(opt.id)}
          {...CUE_PRESS}
          className={`py-3 rounded-2xl font-body text-sm transition-[background-color,color,border-color] ${
            selectedToken === opt.id
              ? "bg-amber text-[#1a1206] border border-amber font-semibold"
              : "bg-ash/70 text-bone/70 border border-ember/50 hover:border-amber/40"
          }`}
        >
          <div className="font-semibold">{opt.label}</div>
          <div className="text-[10px] font-mono opacity-70 mt-0.5">{opt.description}</div>
        </button>
      ))}
    </div>
  );

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <p className="text-dim font-mono text-[10px] uppercase tracking-widest text-center">
          Pay with
        </p>
        {tokenPicker}
        <HumanCta onClick={() => setWalletOpen(true)} disabled={isConnecting}>
          {isConnecting ? "Connecting…" : "Connect wallet to pay →"}
        </HumanCta>
        <p className="text-dim font-mono text-[10px] text-center">
          {isCeloSelected ? "Celo network" : "World Chain"} · fee goes straight to the pot
        </p>
        <WalletModal
          open={walletOpen}
          onClose={() => setWalletOpen(false)}
          connectors={connectors}
          isConnecting={isConnecting}
          onConnect={(connector) => {
            setError(null);
            connect({ connector });
          }}
        />
        {error && <p className="text-blood font-mono text-xs text-center">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-ash/50 rounded-2xl px-3 py-2.5 border border-ember/30">
        <span className="text-bone font-mono text-xs truncate">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
        <GhostLink onClick={() => disconnect()}>Disconnect</GhostLink>
      </div>

      {confirmed || isConfirmed ? (
        <div className="text-center py-3">
          <p className="font-display text-2xl text-neon mb-1">You&apos;re in</p>
          <p className="text-bone/70 font-body text-sm">Slot reserved. Taking you to the lobby…</p>
        </div>
      ) : (
        <>
          {tokenPicker}
          <HumanCta onClick={handlePay} disabled={isSending || isConfirming}>
            {isSending
              ? "Confirm in wallet…"
              : isConfirming
                ? "Confirming…"
                : `Pay ${selectedToken === "wld" ? "1 WLD" : "5 cUSD"} →`}
          </HumanCta>
        </>
      )}

      {error && (
        <p className="text-blood font-mono text-xs text-center">{error}</p>
      )}
    </div>
  );
}
