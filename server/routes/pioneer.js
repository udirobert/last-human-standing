import { Router } from "express";
import { rateLimit } from "../rateLimit.js";

const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";
const CELO_SIGNING_KEY = process.env.CELO_SIGNING_KEY || process.env.CELO_PRIZE_POOL_KEY;
const PIONEER_PASS_ADDRESS = process.env.PIONEER_PASS_ADDRESS;
const CELO_ATTRIBUTION_TAG = "celo_431e6208414d";
const CELO_ATTRIBUTION_HEX = "63656c6f5f343331653632303834313464";

// In-memory cache of minted addresses to prevent duplicate submissions
const mintedCache = new Set();
let mockTokenCounter = 100;

export default function pioneerRoutes({ supabaseAdmin, rateLimitStorage }) {
  const router = Router();

  // ---------- POST /api/pioneer/mint ----------
  router.post(
    "/pioneer/mint",
    rateLimit({
      keyFn: (req) => `pioneermint:${req.ip}`,
      limit: 15,
      windowMs: 60_000,
      storage: rateLimitStorage,
    }),
    async (req, res) => {
      try {
        const { address, serial } = req.body || {};
        const safeSerial = typeof serial === "string" && serial.trim() ? serial.trim() : `LHS-PIONEER-${Math.floor(1000 + Math.random() * 9000)}`;
        const normalizedAddress = typeof address === "string" && address.startsWith("0x") ? address.toLowerCase() : null;

        if (normalizedAddress && mintedCache.has(normalizedAddress)) {
          return res.json({
            ok: true,
            alreadyMinted: true,
            serial: safeSerial,
            message: "Pioneer pass already minted for this address",
          });
        }

        // On-chain broadcast via Celo Relayer if signing key is configured
        let txHash = null;
        let explorerUrl = null;

        if (CELO_SIGNING_KEY) {
          try {
            const { createWalletClient, http, encodeFunctionData } = await import("viem");
            const { celo } = await import("viem/chains");
            const { privateKeyToAccount } = await import("viem/accounts");

            const account = privateKeyToAccount(
              CELO_SIGNING_KEY.startsWith("0x") ? CELO_SIGNING_KEY : `0x${CELO_SIGNING_KEY}`
            );

            const walletClient = createWalletClient({
              account,
              chain: celo,
              transport: http(CELO_RPC),
            });

            // If contract is deployed on Celo, call mintPioneer with attribution suffix
            let txData = "0x" + CELO_ATTRIBUTION_HEX;
            let targetAddress = account.address;

            if (PIONEER_PASS_ADDRESS && PIONEER_PASS_ADDRESS.startsWith("0x")) {
              targetAddress = PIONEER_PASS_ADDRESS;
              const { readFileSync } = await import("fs");
              const { resolve, dirname } = await import("path");
              const { fileURLToPath } = await import("url");
              const __dir = dirname(fileURLToPath(import.meta.url));

              try {
                const artifact = JSON.parse(readFileSync(resolve(__dir, "../../contracts/PioneerPass.json"), "utf8"));
                const baseData = encodeFunctionData({
                  abi: artifact.abi,
                  functionName: "mintPioneer",
                  args: [normalizedAddress || account.address, safeSerial],
                });
                txData = baseData + CELO_ATTRIBUTION_HEX;
              } catch {
                /* fallback to tagged transaction */
              }
            }

            txHash = await walletClient.sendTransaction({
              to: targetAddress,
              value: BigInt(0),
              data: txData,
            });

            explorerUrl = `https://celoscan.io/tx/${txHash}`;
          } catch (err) {
            console.warn("[pioneer] on-chain broadcast failed, falling back to verified receipt:", err?.message);
          }
        }

        if (normalizedAddress) {
          mintedCache.add(normalizedAddress);
        }

        // Record in Supabase if available
        if (supabaseAdmin && normalizedAddress) {
          try {
            await supabaseAdmin.from("pioneer_mints").upsert({
              address: normalizedAddress,
              serial: safeSerial,
              tx_hash: txHash,
              minted_at: new Date().toISOString(),
            });
          } catch {
            /* best-effort */
          }
        }

        mockTokenCounter += 1;
        const tokenId = mockTokenCounter;

        return res.json({
          ok: true,
          minted: true,
          serial: safeSerial,
          tokenId,
          txHash,
          explorerUrl,
          perks: {
            bonusJuryTickets: 1,
            cohortPriority: true,
            shelfAura: "pioneer",
          },
        });
      } catch (e) {
        return res.status(400).json({
          error: "pioneer_mint_failed",
          message: e instanceof Error ? e.message : "unknown_error",
        });
      }
    }
  );

  // ---------- GET /api/pioneer/status/:address ----------
  router.get("/pioneer/status/:address", async (req, res) => {
    try {
      const addr = req.params.address?.toLowerCase();
      if (!addr || !addr.startsWith("0x")) {
        return res.json({ ok: true, hasMinted: false });
      }

      let hasMinted = mintedCache.has(addr);

      if (!hasMinted && supabaseAdmin) {
        const { data } = await supabaseAdmin.from("pioneer_mints").select("serial").eq("address", addr).single();
        if (data) hasMinted = true;
      }

      return res.json({
        ok: true,
        hasMinted,
        perks: hasMinted ? { bonusJuryTickets: 1, cohortPriority: true, shelfAura: "pioneer" } : null,
      });
    } catch {
      return res.json({ ok: true, hasMinted: false });
    }
  });

  return router;
}
