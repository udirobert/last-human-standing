/**
 * PacketStrip — the postmark stub under each filing.
 *
 * NIGHT SHIFT crossover: the paper is what jurors judge; the packet is
 * what the filing *is*. Same four fields on every card — PKT (latency
 * after open), ORIGIN (ground fix), HOPS (same-day attempts), RCPT
 * (counter flags). Values outside the human distribution render "hot".
 *
 * The strip never tells you the verdict — it just refuses to hide the
 * number. Stamp responsibly.
 */
const FIELDS = [
  ["pkt", "PKT"],
  ["origin", "ORIGIN"],
  ["hops", "HOPS"],
  ["rcpt", "RCPT"],
];

export default function PacketStrip({ packet }) {
  if (!packet) return null;
  const tells = new Set(packet.tells || []);
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
