/**
 * The packet — postmark telemetry riding beside each submission.
 *
 * NIGHT SHIFT's signature mechanic, on real dockets: the paper (photo +
 * caption) is what jurors judge; the packet is what the filing *is* —
 * how fast it landed, whether it has a ground fix, how many attempts
 * stand behind it, and what the counters already noticed.
 *
 * Every submission carries the same four fields; the values are the
 * testimony. A filing that satisfies every criterion can still carry a
 * packet no human would produce — `+0.003s` after open is the classic.
 *
 * Fields mirror the jam's stub (PKT · ORIGIN · HOPS · RCPT) so anyone
 * who learned the verb on the night desk already knows how to read it.
 *
 * Pure builder — the feed route gathers the inputs, this formats them.
 */

/**
 * @param {object} opts
 * @param {number} opts.createdAtMs  submission.created_at in ms
 * @param {number|null} opts.opensAtMs round.opens_at in ms (null → "—")
 * @param {boolean|null} opts.hasGeo   check-in row carried GPS (null = no row)
 * @param {number} opts.subCount       submissions by this address on this day
 * @param {string[]} [opts.flagReasons] submission_flags reasons for this id
 */
export function buildPacket({ createdAtMs, opensAtMs, hasGeo, subCount, flagReasons = [] }) {
  return {
    pkt: formatLatency(createdAtMs, opensAtMs),
    origin: hasGeo === true ? "geo" : hasGeo === false ? "remote" : "none",
    hops: Math.max(1, Number(subCount) || 1),
    rcpt: flagReasons.length ? flagReasons.join(" · ") : "clean",
  };
}

/** `+0.003s` | `+47s` | `+12m` | `+3h` — the jam's postmark latency format. */
export function formatLatency(createdAtMs, opensAtMs) {
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(opensAtMs)) return "—";
  const ms = createdAtMs - opensAtMs;
  if (ms < 0) return "pre-open";
  if (ms < 1000) return `+${(ms / 1000).toFixed(3)}s`;
  if (ms < 60_000) return `+${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `+${Math.round(ms / 60_000)}m`;
  return `+${Math.round(ms / 3_600_000)}h`;
}

/**
 * Human-norm check used by the UI to dim vs light fields.
 * A value outside the human distribution renders "hot" — the packet
 * doesn't judge, it just refuses to hide the number.
 */
export function packetTell(packet) {
  const tells = [];
  if (packet.pkt === "pre-open" || /^\+\d\.\d{3}s$/.test(packet.pkt)) tells.push("pkt");
  // "remote" (GPS declined) is common human variance; "none" means the
  // filing has no check-in record at all — paper with no clerk signature.
  if (packet.origin === "none") tells.push("origin");
  if (packet.hops > 2) tells.push("hops");
  if (packet.rcpt !== "clean") tells.push("rcpt");
  return tells;
}
