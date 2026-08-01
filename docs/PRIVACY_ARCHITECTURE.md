# Privacy architecture

## Product decision

Last Human Standing remains a **two-chain, multi-root proof-of-humanity game**. We will not add Base or Inco to the production architecture at this stage.

| Foundation | Product responsibility |
|---|---|
| World / World ID / World Chain | World App distribution, mobile wallet UX, World ID, WLD entry, chat and signed check-ins. |
| Celo / Self | Document-backed proof of humanity, optional age or jurisdiction rules, and cUSD/USDC settlement. |

The chains are not mirrors. A cohort has one canonical chain for its entry payment, eligibility and game contract. World cohorts are native to World Chain; Self/Celo cohorts are native to Celo.

## Identity policy

World ID and Self are both foundational, but their nullifiers are independent privacy-preserving identifiers. An `either World ID or Self` rule in one shared prize cohort cannot prove that one person has not entered once through each provider with different wallets.

Until a privacy-preserving cross-provider linking design is selected, the product policy is:

- Run provider-specific cohorts, or require both proofs for an explicitly high-assurance cohort.
- Do not claim global one-human-one-slot across a cohort that accepts either proof.
- Store only the provider, provider-specific nullifier and wallet binding required to enforce the selected cohort rule. Do not publish raw identity data.

## Privacy v1: commit–reveal audit voting

The existing public `VoteRegistry` writes every HUMAN/SUS decision to an event at voting time. That exposes live sentiment and enables anchoring, retaliation and coordination.

Privacy v1 replaces that publishing pattern for new cohorts with `CommitRevealVoteRegistry`:

1. The cohort owner creates an audit round with a commit deadline and a later reveal deadline.
2. A voter generates a random 32-byte salt locally and computes a commitment for their decision.
3. During the commit phase, the contract records only the commitment hash.
4. During the reveal phase, the voter submits the same decision and salt. The contract verifies the hash and adds the vote to the tally.
5. Only revealed votes count. A voter who does not reveal is excluded from that submission's tally.

The commitment is bound to the contract address, chain ID, round, submission, voter, decision and salt. It cannot be reused on another chain, contract, round or submission.

### What this protects

- No live voter can see another voter’s HUMAN/SUS choice before the reveal phase.
- Public observers cannot derive the tally from commitments.
- A voter cannot alter their decision after committing.

### What this does not protect

- Revealed votes, voter addresses and final tallies are public after the reveal phase.
- A voter can abstain from revealing; the game rules must define the consequence. Privacy v1 excludes the ballot.
- Commit–reveal is not encrypted tallying or a permanently secret ballot system.

If player research shows the game needs private computation after the audit closes, evaluate threshold-encrypted ballots, MPC or a narrowly scoped confidential-computing rail. That is a later decision, not a reason to add a third chain now.

## Contract and deployment

`contracts/CommitRevealVoteRegistry.sol` is a new contract and does not alter the deployed legacy registry. It is chain-agnostic EVM Solidity and can be deployed to either Celo or World Chain.

Compile it without deploying:

```sh
node scripts/compile-and-deploy-commit-reveal-vote.js
```

Deploy deliberately to the cohort’s canonical chain:

```sh
VOTE_CHAIN=celo VOTE_RPC=<rpc-url> VOTE_SIGNING_KEY=<key> node scripts/compile-and-deploy-commit-reveal-vote.js
```

Use `VOTE_CHAIN=worldchain` for a World-native cohort. Deployment is intentionally separate from the live application rollout: the client and server must be updated to generate, persist and reveal the voter-held salts before the new registry is enabled.

## Semaphore prototype status

The repository also contains a feature-flagged Semaphore prototype. It provides a verified-cohort enrollment route, browser-held identity helper, group-root validation, and atomic nullifier storage. It is disabled by default and does not change the current vote endpoint. See [Semaphore spike](./SEMAPHORE_SPIKE.md) for the activation requirements and its remaining limitation: audit groups must be frozen before voting opens.
