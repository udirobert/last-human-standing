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

## Application foundation (default off)

Commit–reveal client + API scaffolding is in the repo and **disabled by default**. Live `/api/vote` tallies stay unchanged until the flag is turned on.

| Env var | Purpose |
|---|---|
| `COMMIT_REVEAL_VOTING_ENABLED` | Must be `"true"` to activate. Default unset/false. |
| `COMMIT_REVEAL_REGISTRY_ADDRESS` | Deployed `CommitRevealVoteRegistry` address. |
| `COMMIT_REVEAL_CHAIN_ID` | Chain id for commitment binding (default `42220` Celo). |
| `COMMIT_REVEAL_RPC` | Optional RPC for the commit–reveal relayer (falls back to `CELO_RPC`). |

Client salt store key format:

`lhs:vote-commit:v1:{cohort}:{roundId}:{submissionId}:{voter}`

Salts never leave the browser except on `POST /api/vote/reveal`. Commitment hashing lives in [`src/lib/commitRevealVote.js`](../src/lib/commitRevealVote.js) and matches `commitmentFor` on the contract.

When the flag is on:

- `POST /api/vote` returns `409 commit_reveal_required`.
- `POST /api/vote/commit` stores a service-role `vote_commits` row and enqueues an onchain commit job.
- During the commit phase, `/api/feed` seals HUMAN/SUS tallies and exposes commit counts only.
- `POST /api/vote/reveal` verifies the salt against the stored commitment, writes the public `votes` row, and enqueues an onchain reveal job.
- Round deadlines come from `rounds.commit_deadline` / `rounds.reveal_deadline` (migration `028_vote_commits.sql`), with `closes_at` as the commit-deadline fallback.

### Activation checklist

1. Apply migration `028_vote_commits.sql`.
2. Compile and deploy `CommitRevealVoteRegistry` to the cohort’s canonical chain; keep the deployer key as contract owner (relayer).
3. Set `COMMIT_REVEAL_REGISTRY_ADDRESS`, `COMMIT_REVEAL_CHAIN_ID`, and signing/RPC env for the relayer.
4. Set `commit_deadline` / `reveal_deadline` on the open round (or rely on `closes_at` for commit end).
5. Call `createRound` on the registry with matching Unix deadlines.
6. Set `COMMIT_REVEAL_VOTING_ENABLED=true` and restart the API.
7. Smoke: commit a ballot → feed shows sealed count → after deadline reveal → public tally appears.

Do **not** enable this in production until salts + reveal UX have been exercised on a test cohort.

## Semaphore prototype status

The repository also contains a feature-flagged Semaphore prototype. It provides a verified-cohort enrollment route, browser-held identity helper, group-root validation, and atomic nullifier storage. It is disabled by default (`SEMAPHORE_AUDIT_ENABLED` must be `"true"`) and does not change the current vote endpoint. Migration `027_semaphore_audit.sql` is separate from commit–reveal and should only be applied for a deliberate Semaphore prototype cohort. See [Semaphore spike](./SEMAPHORE_SPIKE.md).
