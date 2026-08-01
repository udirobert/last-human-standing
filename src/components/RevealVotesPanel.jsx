import { useState } from "react";
import { HumanCta } from "./ui/CraftCta.jsx";
import { listPendingReveals, markBallotRevealed } from "../lib/commitRevealStore.js";

/**
 * Sticky panel during the reveal phase — one tap per committed ballot.
 */
export default function RevealVotesPanel({
  cohort,
  roundId,
  voter,
  revealDeadline,
  onRevealed,
}) {
  const [pending, setPending] = useState(() =>
    listPendingReveals({ cohort, roundId, voter }),
  );
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  if (!voter || pending.length === 0) return null;

  const revealOne = async (ballot) => {
    setBusyId(ballot.submissionId);
    setError(null);
    try {
      const resp = await fetch("/api/vote/reveal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          submissionId: ballot.submissionId,
          vote: ballot.vote,
          salt: ballot.salt,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data.error || "reveal_failed");
        return;
      }
      markBallotRevealed({
        cohort,
        roundId,
        submissionId: ballot.submissionId,
        voter,
      });
      setPending((rows) => rows.filter((r) => r.submissionId !== ballot.submissionId));
      onRevealed?.(ballot, data);
    } catch {
      setError("reveal_network");
    } finally {
      setBusyId(null);
    }
  };

  const revealAll = async () => {
    const queue = [...pending];
    await queue.reduce(
      (chain, ballot) => chain.then(() => revealOne(ballot)),
      Promise.resolve(),
    );
  };

  return (
    <div className="mx-1 mb-4 p-4 rounded-2xl bg-neon/10 border border-neon/40">
      <p className="font-mono text-neon text-xs uppercase tracking-widest mb-1">Reveal your votes</p>
      <p className="text-bone/80 text-sm font-body leading-relaxed mb-3">
        Commit window closed. Reveal {pending.length} sealed ballot{pending.length === 1 ? "" : "s"}
        {revealDeadline
          ? ` before ${new Date(revealDeadline).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
          : ""}
        . Unrevealed ballots do not count.
      </p>
      <HumanCta onClick={revealAll} disabled={busyId != null} className="!py-3 !text-sm">
        {busyId != null ? "Revealing…" : `Reveal ${pending.length} vote${pending.length === 1 ? "" : "s"} →`}
      </HumanCta>
      {error && (
        <p className="text-blood font-mono text-[10px] mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
