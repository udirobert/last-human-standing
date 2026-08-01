import solc from "solc";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createPublicClient, createWalletClient, http } from "viem";
import { celo, worldchain } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const voteChain = process.env.VOTE_CHAIN || "celo";
const chains = { celo, worldchain };
const chain = chains[voteChain];
const rpcUrl = process.env.VOTE_RPC;
const signingKey = process.env.VOTE_SIGNING_KEY;

if (!chain) {
  throw new Error("VOTE_CHAIN must be either 'celo' or 'worldchain'");
}

function compile() {
  const source = readFileSync(resolve(__dirname, "../contracts/CommitRevealVoteRegistry.sol"), "utf8");
  const input = {
    language: "Solidity",
    sources: { "CommitRevealVoteRegistry.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((item) => item.severity === "error");
  if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));

  const contract = output.contracts["CommitRevealVoteRegistry.sol"]["CommitRevealVoteRegistry"];
  writeFileSync(
    resolve(__dirname, "../contracts/CommitRevealVoteRegistry.json"),
    JSON.stringify({ abi: contract.abi, bytecode: contract.evm.bytecode.object }, null, 2),
  );
  console.log("Compilation OK; artifact saved to contracts/CommitRevealVoteRegistry.json");
  return contract;
}

async function deploy(contract) {
  if (!signingKey || !rpcUrl) {
    console.log("Set VOTE_SIGNING_KEY and VOTE_RPC to deploy; compilation only.");
    return;
  }
  const account = privateKeyToAccount(signingKey);
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const hash = await walletClient.deployContract({ abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`CommitRevealVoteRegistry deployed on ${chain.name}: ${receipt.contractAddress}`);
}

const contract = compile();
deploy(contract).catch((error) => {
  console.error(error);
  process.exit(1);
});
