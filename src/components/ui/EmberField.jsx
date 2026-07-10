import { useEffect, useState } from "react";

/**
 * EmberField — a warm, living ripple woven into the hero's own ambient layer
 * (docs/ART_DIRECTION.md). Second attempt: the first version was a
 * position:fixed, full-page particle layer with fully random scatter, which
 * had two real problems — (1) random scatter never reads as a "wave", just
 * independent twinkling, and (2) being fixed/full-page, it bled through the
 * many semi-transparent card backgrounds elsewhere on the page, looking like
 * foreground clutter rather than backdrop.
 *
 * Both fixed at the root this time:
 *   - Concentric RINGS around the same point as the warm halo, not random
 *     scatter. Each ring shares one phase, and adjacent rings are offset —
 *     so brightness/size visibly propagates outward ring-by-ring, an actual
 *     traveling ripple (the real idea worth keeping from the breathing-dots /
 *     Dave Whyte reference), not scattered twinkling.
 *   - Rendered INSIDE LandingHero's own `absolute inset-0 overflow-hidden`
 *     ambient container — the exact same box the tree/cat/coffee/sun motifs
 *     already live in. Never `position: fixed`, never able to escape the
 *     hero or bleed into any card below it.
 *
 * Gooey SVG filter (feGaussianBlur + feColorMatrix threshold) is the same
 * family as BubbleLoader — kept because it's what makes adjacent dots in a
 * ring melt softly into one another rather than reading as separate beads.
 */

const RINGS = [
  { radius: 14, count: 6, size: 7 },
  { radius: 24, count: 9, size: 6 },
  { radius: 34, count: 12, size: 5 },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export default function EmberField({ cx = 50, cy = 42, className = "" }) {
  const reduce = usePrefersReducedMotion();
  const uid = "ember";

  const [dots] = useState(() =>
    RINGS.flatMap((ring, ringIndex) =>
      Array.from({ length: ring.count }, (_, i) => {
        const angle = (i / ring.count) * Math.PI * 2 + ringIndex * 0.3;
        return {
          id: `${ringIndex}-${i}`,
          ringIndex,
          angle,
          radius: ring.radius,
          size: ring.size,
          jitter: Math.random() * 0.6, // tiny per-dot phase offset, organic not robotic
        };
      }),
    ),
  );

  useEffect(() => {
    if (reduce) return undefined;
    const svg = document.getElementById(`${uid}-svg`);
    const els = svg?.querySelectorAll("circle") || [];
    let raf = 0;

    const tick = (tMs) => {
      const t = tMs / 1000;
      // Ring-level phase offset (not per-dot random) is what makes this read
      // as a wave: ring 0 crests, then ring 1, then ring 2 — a pulse
      // traveling outward, matching the ripple visibly rather than implying it.
      const speed = 0.55;
      const ringPhaseStep = 0.85;
      dots.forEach((d, i) => {
        const el = els[i];
        if (!el) return;
        const phase = t * speed - d.ringIndex * ringPhaseStep + d.jitter;
        const wave = 0.5 + 0.5 * Math.sin(phase);
        const x = cx + Math.cos(d.angle) * d.radius;
        const y = cy + Math.sin(d.angle) * d.radius * 0.4; // slightly flattened, hugs the halo
        el.setAttribute("cx", `${x}%`);
        el.setAttribute("cy", `${y}%`);
        el.setAttribute("r", (d.size * (0.6 + 0.5 * wave)).toFixed(2));
        el.setAttribute("opacity", (0.28 + 0.4 * wave).toFixed(2));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dots, reduce, cx, cy]);

  return (
    <svg id={`${uid}-svg`} aria-hidden="true" className={`absolute inset-0 w-full h-full ${className}`}>
      <defs>
        {/* Explicit, generous filter region (default -10%/120% wasn't enough) —
            with percentage-based cx/cy children and no viewBox, the filter's
            auto-computed bounding box clipped the dots to nothing. Same fix
            pattern as GouacheFilters. */}
        <filter id={`${uid}-goo`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
        </filter>
      </defs>
      <g filter={`url(#${uid}-goo)`}>
        {dots.map((d) => {
          const x = cx + Math.cos(d.angle) * d.radius;
          const y = cy + Math.sin(d.angle) * d.radius * 0.4;
          return <circle key={d.id} cx={`${x}%`} cy={`${y}%`} r={d.size} fill="#F4B84A" opacity={reduce ? 0.3 : 0.35} />;
        })}
      </g>
    </svg>
  );
}
