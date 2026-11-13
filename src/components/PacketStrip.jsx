/**
 * PacketStrip — the postmark stub under each filing.
 *
 * NIGHT SHIFT crossover: the paper is what jurors judge; the packet is
 * what the filing *is*. Same four fields on every card — PKT (latency
 * after open), ORIGIN (ground fix), HOPS (same-day attempts), RCPT
 * (counter flags).
 *
 * Anchoring guard: until the juror commits a vote (or the filing is
 * already resolved), out-of-distribution values render in the same muted
 * type as everything else — the evidence is on the card, but nothing
 * pre-highlights it. After the stamp lands, the tells light — same
 * pedagogy as the night desk: you commit, then you see what you read.
 */
const FIELDS = [
  ["pkt", "PKT"],
  ["origin", "ORIGIN"],
  ["hops", "HOPS"],
  ["rcpt", "RCPT"],
];

export default function PacketStrip({ packet, revealed = false }) {
  if (!packet) return null;
  const tells = revealed ? new Set(packet.tells || []) : new Set();
  return (
    <div className="mt-2 rounded-lg border border-ember/40 bg-ash/60 px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {FIELDS.map(([key, label]) => {
          const value = key === "hops" ? String(packet.hops ?? 1) : String(packet[key] ?? "—");
          const hot = tells.has(key);
          return (
            <span key={key} className="font-mono text-[9px] tracking-wider whitespace-nowrap">
              <span className="text-dim/60">{label} </span>
              <span className={hot ? "text-blood/90" : "text-dim"}>{value}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
