import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createPublicClient, createWalletClient, http } from "viem";
import { celo, worldchain } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";
const WORLD_RPC = process.env.WORLD_RPC || "https://worldchain-mainnet.g.alchemy.com/public";
const CELO_SIGNING_KEY = process.env.CELO_SIGNING_KEY || process.env.CELO_PRIZE_POOL_KEY;
const TARGET_CHAIN = process.env.CHAIN || "celo";

async function loadOrCompileArtifact() {
  const jsonPath = resolve(__dirname, "../contracts/PioneerPass.json");
  if (existsSync(jsonPath)) {
    console.log("Loading existing artifact from contracts/PioneerPass.json...");
    return JSON.parse(readFileSync(jsonPath, "utf8"));
  }

  const { default: solc } = await import("solc");
  const source = readFileSync(resolve(__dirname, "../contracts/PioneerPass.sol"), "utf8");

  const input = {
    language: "Solidity",
    sources: { "PioneerPass.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts["PioneerPass.sol"]["PioneerPass"];

  if (!contract) {
    console.error("Compilation failed:", JSON.stringify(output.errors, null, 2));
    process.exit(1);
  }

  console.log("Compilation OK");
  const artifact = { abi: contract.abi, bytecode: contract.evm.bytecode.object };
  writeFileSync(jsonPath, JSON.stringify(artifact, null, 2));
  console.log("Saved artifact to contracts/PioneerPass.json");

  return artifact;
}

async function deploy({ abi, bytecode }) {
  if (!CELO_SIGNING_KEY) {
    console.log("No signing key set in environment. Skipping on-chain broadcast.");
    return null;
  }

  const isWorld = TARGET_CHAIN === "world" || TARGET_CHAIN === "worldchain";
  const chain = isWorld ? worldchain : celo;
  const rpcUrl = isWorld ? WORLD_RPC : CELO_RPC;

  const account = privateKeyToAccount(
    CELO_SIGNING_KEY.startsWith("0x") ? CELO_SIGNING_KEY : `0x${CELO_SIGNING_KEY}`
  );

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  console.log(`Deploying PioneerPass from ${account.address} on ${chain.name}...`);

  const hash = await walletClient.deployContract({
    abi,
    bytecode: `0x${bytecode}`,
  });

  console.log(`Deployment transaction submitted: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  console.log(`PioneerPass successfully deployed at: ${contractAddress}`);
  console.log(`Explorer: ${isWorld ? `https://worldscan.org/address/${contractAddress}` : `https://celoscan.io/address/${contractAddress}`}`);

  return contractAddress;
}

async function main() {
  const { abi, bytecode } = await loadOrCompileArtifact();
  const address = await deploy({ abi, bytecode });

  if (address) {
    console.log(`\nPIONEER_PASS_ADDRESS=${address}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
