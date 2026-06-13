import solc from "solc";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createPublicClient, createWalletClient, http } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";
const CELO_SIGNING_KEY = process.env.CELO_SIGNING_KEY;
const CHAIN_ID = 42220;

async function compile() {
  const source = readFileSync(resolve(__dirname, "../contracts/VoteRegistry.sol"), "utf8");

  const input = {
    language: "Solidity",
    sources: { "VoteRegistry.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts["VoteRegistry.sol"]["VoteRegistry"];

  if (!contract) {
    console.error("Compilation failed:", JSON.stringify(output.errors, null, 2));
    process.exit(1);
  }

  console.log("Compilation OK");
  writeFileSync(
    resolve(__dirname, "../contracts/VoteRegistry.json"),
    JSON.stringify({ abi: contract.abi, bytecode: contract.evm.bytecode.object }, null, 2),
  );
  console.log("ABI+bytecode saved to contracts/VoteRegistry.json");

  return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
}

async function deploy({ abi, bytecode }) {
  if (!CELO_SIGNING_KEY) {
    console.log("No CELO_SIGNING_KEY set — skipping deploy. ABI+bytecode saved for manual deployment.");
    return null;
  }

  const account = privateKeyToAccount(CELO_SIGNING_KEY);
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(CELO_RPC),
  });
  const publicClient = createPublicClient({
    chain: celo,
    transport: http(CELO_RPC),
  });

  console.log(`Deploying VoteRegistry from ${account.address} on Celo mainnet...`);

  const hash = await walletClient.deployContract({
    abi,
    bytecode: `0x${bytecode}`,
  });

  console.log(`Deploy tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  console.log(`VoteRegistry deployed at: ${contractAddress}`);

  // Save address
  writeFileSync(
    resolve(__dirname, "../contracts/.voteregistry"),
    contractAddress,
  );
  console.log(`Address saved to contracts/.voteregistry`);

  return contractAddress;
}

async function main() {
  const { abi, bytecode } = await compile();
  const address = await deploy({ abi, bytecode });

  if (address) {
    console.log(`\nVOTE_REGISTRY_ADDRESS=${address}`);
    console.log(`Add this to your production .env as VOTE_REGISTRY_ADDRESS`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
