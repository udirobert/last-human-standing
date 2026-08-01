# Semaphore spike

## Objective

Validate whether Semaphore can provide anonymous, one-vote-per-audit signalling for Last Human Standing without introducing a third chain.

## What this spike proves

`scripts/semaphore-spike.mjs` uses Semaphore v4 to:

1. Create an ephemeral voter identity and four decoy identities.
2. Add their identity commitments to a five-member group.
3. Generate a proof for a HUMAN vote scoped to one cohort, round and submission.
4. Verify the proof locally.
5. Return the nullifier that a contract would record to prevent a second vote in that scope.

Run it with:

```sh
npm run semaphore:spike
```

The script creates no persistent identity and never uses a World ID or Self credential. Do not persist a Semaphore identity in server storage: the player must control it locally for anonymity to hold.

## Stage two: anonymous commitment verifier

Run the second prototype with:

```sh
npm run semaphore:audit-spike
```

This constructs a private HUMAN/SUS commitment using a voter-held random salt, submits that commitment as the public Semaphore message, and verifies it without learning the voter identity or decision. It also proves two essential rejection cases:

- the same nullifier cannot signal twice in one audit scope;
- a proof cannot be replayed against another scope.

The shared verifier helpers live in [semaphoreAudit.js](../server/lib/semaphoreAudit.js). The offline spike keeps nullifiers in memory; the Express path below uses Supabase unique keys for atomic replay protection across processes.

## Feature-flagged integration

The Express integration is implemented but disabled by default (`SEMAPHORE_AUDIT_ENABLED` must be `"true"`). Apply migration `027_semaphore_audit.sql`, then enable the flag only for a test cohort.

- `src/lib/semaphoreIdentity.js` creates and persists a Semaphore identity in the player's browser and exposes only its identity commitment. The private identity must never be sent to the API.
- `POST /api/semaphore/enroll` accepts that commitment only from a paid, active-cohort player whose World ID or Self proof has already been verified.
- `GET /api/semaphore/group` returns the deterministic cohort commitment list and Merkle root needed for local proof generation.
- `POST /api/semaphore/signal` verifies a proof against that root and atomically inserts its nullifier into `semaphore_audit_nullifiers`. The unique primary key rejects races and replay across API processes without recording the voter address.

The APIs do not alter `/api/vote` or the live tally. They are intentionally a parallel test path until the product approves anonymous voting and the reveal/finalization flow is implemented.

### Operational requirement

Freeze enrollment before opening an audit. Semaphore proofs are bound to a group root; changing group membership after a player fetches the group makes that player's proof stale. The current prototype returns the root with the group so a client can refetch and retry, but production should persist an audit-specific group snapshot before voting opens.

## Result interpretation

Semaphore proves **some member of the eligible cohort** voted and allows one signal per scope, without exposing which member. It does not conceal the signal's message. In this spike, `1` means HUMAN and is public to a verifier.

Therefore Semaphore is a candidate for anonymous voting, but it does not replace commit–reveal or encrypted ballots when the game needs to hide the HUMAN/SUS choice while voting is open.

## Adoption design, if chosen

1. After World ID or Self verification, the player generates a Semaphore identity locally and submits only its identity commitment.
2. The canonical cohort contract adds that commitment to its eligibility group. The application must decide how to prevent the same person enrolling more than one commitment.
3. Each audit signal has a unique scope: `cohort + round + submission`.
4. The voting contract verifies the proof and records its nullifier. It must reject a reused nullifier.
5. Combine the anonymous signal with either:
   - commit–reveal, to hide the decision only until reveal; or
   - an encrypted ballot/tally system, if permanent vote secrecy is required.

## Decision criteria

Adopt Semaphore only if the product requires voters to be unlinkable from their votes after the audit. For the current need—preventing live-vote anchoring—the smaller commit–reveal registry remains the preferred production path.
