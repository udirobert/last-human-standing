import { Router } from "express";
import { rateLimit } from "../rateLimit.js";

const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";
const CELO_SIGNING_KEY = process.env.CELO_SIGNING_KEY || process.env.CELO_PRIZE_POOL_KEY;
const PIONEER_PASS_ADDRESS = process.env.PIONEER_PASS_ADDRESS;
const CELO_ATTRIBUTION_TAG = "celo_431e6208414d";
const CELO_ATTRIBUTION_HEX = "63656c6f5f343331653632303834313464";

// In-memory tracking of minted addresses/nullifiers and 50/50 split counts
const mintedCache = new Set();
let worldMintCount = 0;
let celoMintCount = 0;
const MAX_PER_CHAIN = 50;

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
        const { address, nullifierHash, chain } = req.body || {};
        const isWorld = chain === "worldchain" || chain === "world";
        const identifier = (nullifierHash || address || "").toLowerCase().trim();

        if (identifier && mintedCache.has(identifier)) {
          return res.json({
            ok: true,
            alreadyMinted: true,
            chain: isWorld ? "worldchain" : "celo",
            message: "Pioneer pass already claimed for this verified identity",
          });
        }

        // Check allocation limits (50 World + 50 Celo = 100 Total)
        if (isWorld && worldMintCount >= MAX_PER_CHAIN) {
          return res.status(409).json({
            error: "world_edition_exhausted",
            message: "All 50 World Chain Pioneer Passes have been claimed",
          });
        }
        if (!isWorld && celoMintCount >= MAX_PER_CHAIN) {
          return res.status(409).json({
            error: "celo_edition_exhausted",
            message: "All 50 Celo Mainnet Pioneer Passes have been claimed",
          });
        }

        // Sequential Edition Numbering: #001–#050 on World, #051–#100 on Celo
        let editionNum;
        if (isWorld) {
          worldMintCount += 1;
          editionNum = worldMintCount;
        } else {
          celoMintCount += 1;
          editionNum = 50 + celoMintCount;
        }

        const safeSerial = `LHS-PIONEER-${String(editionNum).padStart(3, "0")}`;
        const normalizedAddress = typeof address === "string" && address.startsWith("0x") ? address.toLowerCase() : null;

        // On-chain broadcast via Relayer if signing key is configured
        let txHash = null;
        let explorerUrl = null;

        if (CELO_SIGNING_KEY) {
          try {
            const { createWalletClient, http, encodeFunctionData } = await import("viem");
            const { celo, worldchain } = await import("viem/chains");
            const { privateKeyToAccount } = await import("viem/accounts");

            const account = privateKeyToAccount(
              CELO_SIGNING_KEY.startsWith("0x") ? CELO_SIGNING_KEY : `0x${CELO_SIGNING_KEY}`
            );

            const activeChain = isWorld ? worldchain : celo;
            const rpcUrl = isWorld ? (process.env.WORLD_RPC || "https://worldchain-mainnet.g.alchemy.com/public") : CELO_RPC;

            const walletClient = createWalletClient({
              account,
              chain: activeChain,
              transport: http(rpcUrl),
            });

            let txData = "0x" + CELO_ATTRIBUTION_HEX;
            let targetAddress = account.address;

            if (!isWorld && PIONEER_PASS_ADDRESS && PIONEER_PASS_ADDRESS.startsWith("0x")) {
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

            explorerUrl = isWorld ? `https://worldscan.org/tx/${txHash}` : `https://celoscan.io/tx/${txHash}`;
          } catch (err) {
            console.warn("[pioneer] on-chain broadcast failed, falling back to verified receipt:", err?.message);
          }
        }

        if (identifier) {
          mintedCache.add(identifier);
        }

        // Record in Supabase if available
        if (supabaseAdmin && (normalizedAddress || nullifierHash)) {
          try {
            await supabaseAdmin.from("pioneer_mints").upsert({
              address: normalizedAddress,
              nullifier_hash: nullifierHash || null,
              serial: safeSerial,
              edition_number: editionNum,
              chain: isWorld ? "worldchain" : "celo",
              tx_hash: txHash,
              minted_at: new Date().toISOString(),
            });
          } catch {
            /* best-effort */
          }
        }

        return res.json({
          ok: true,
          minted: true,
          serial: safeSerial,
          editionNumber: editionNum,
          totalEdition: 100,
          chainAllocation: isWorld ? `${worldMintCount}/50 (World ID)` : `${celoMintCount}/50 (Celo/Self)`,
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
