import { useEffect, useId, useRef, useState } from "react";
import { PERSONAS, personaFor } from "./bubblePersonas.js";

/**
 * BubbleLoader — a soft-body "surface tension" loader with a cast of personas.
 *
 * The soul (borrowed from Saharan's bubbles): blobs that MERGE and PINCH APART
 * like liquid, not a ring that spins at a constant rate. We fake the soft-body
 * *look* cheaply with an SVG gooey filter (blur → threshold) over a few blobs,
 * and make the *motion* read as alive with two anti-robot tricks:
 *   1. Incommensurate frequencies — the orbit/breathe periods never share a
 *      common multiple, so there's no visible loop (a constant loop is the #1
 *      "this is a machine" tell).
 *   2. Non-constant rotation — the whole cluster eases faster/slower via a sine,
 *      so it never turns like a gear.
 *
 * DIVERSITY, NOT UNIFORMITY: the app has many humans; the loaders should too.
 * But "diverse" ≠ "random per render" (that reads as a glitch). Every persona
 * below shares the same DNA (gooey soft-body, palette) with its own soul —
 * a varied *population of consistent individuals*, which is what real human
 * diversity actually is. Seed a persona from a stable identity (a handle, an
 * fid) so a given person's bubble is always *theirs*:  <BubbleLoader seed={fid} />
 *
 * Degrades to a calm opacity breathe under prefers-reduced-motion.
 * No new deps: inline SVG + one requestAnimationFrame loop.
 *
 * Props:
 *   size    — px (default 96). Below ~44 it drops the gooey filter.
 *   persona — named personality (see PERSONAS). Overrides seed.
 *   seed    — any string/number; deterministically picks a persona. Same seed
 *             → same persona, always. Great for per-player identity.
 *   color   — override the persona's palette color.
 *   label   — optional caption. String, or an array to cycle human-voice lines.
 *   className
 */

export default function BubbleLoader({
  size = 96,
  persona,
  seed,
  color,
  label = null,
  className = "",
}) {
  const filterId = useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();
  const small = size < 44;

  const key = persona && PERSONAS[persona] ? persona : seed != null ? personaFor(seed) : "steady";
  const p = PERSONAS[key];
  const fill = color || p.color;
  const count = small ? Math.min(3, p.count) : p.count;

  const blobRefs = useRef([]);
  const coreRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduced) return; // CSS handles the calm fallback below
    const cx = size / 2;
    const cy = size / 2;
    const orbit = size * (small ? 0.16 : p.spread);
    const baseR = size * (small ? 0.15 : 0.14);
    // viscosity → how deep the distance-from-center oscillation goes. Gloopy
    // personas barely leave the core (stay fused); loose ones fling out & pinch.
    const reachDepth = 0.9 - p.viscosity * 0.6;
    const reachBase = 1 - reachDepth;

    // Per-blob params. Frequencies are deliberately incommensurate → the
    // composite motion never obviously repeats.
    const blobs = Array.from({ length: count }, (_, i) => ({
      phase: (i / count) * Math.PI * 2,
      breatheFreq: (0.9 + i * 0.37) * p.speed,
      radiusFreq: (1.3 + i * 0.29) * p.speed,
      wobbleFreq: (0.6 + i * 0.53) * p.speed,
    }));

    const tick = (tMs) => {
      const t = tMs / 1000;
      // Cluster rotation that speeds up and slows down — never a constant gear.
      const spin = t * 0.5 * p.speed + Math.sin(t * 0.6 * p.speed) * 0.6;

      blobs.forEach((b, i) => {
        const el = blobRefs.current[i];
        if (!el) return;
        const reach = reachBase + reachDepth * (0.5 + 0.5 * Math.sin(t * b.breatheFreq + b.phase));
        const angle = spin + b.phase + Math.sin(t * b.wobbleFreq) * p.wobble;
        const x = cx + Math.cos(angle) * orbit * reach;
        const y = cy + Math.sin(angle) * orbit * reach;
        const r = baseR * (0.72 + 0.28 * Math.sin(t * b.radiusFreq + b.phase));
        el.setAttribute("cx", x.toFixed(2));
        el.setAttribute("cy", y.toFixed(2));
        el.setAttribute("r", r.toFixed(2));
      });

      if (coreRef.current) {
        const cr = baseR * (1.05 + 0.12 * Math.sin(t * 1.7 * p.speed));
        coreRef.current.setAttribute("r", cr.toFixed(2));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size, count, small, reduced, p, key]);

  const labels = Array.isArray(label) ? label : label ? [label] : [];

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        {!small && (
          <defs>
            {/* Gooey metaball filter: blur, then a high-contrast alpha threshold
                fuses overlapping blobs into one liquid surface. */}
            <filter id={filterId}>
              <feGaussianBlur in="SourceGraphic" stdDeviation={size * 0.06} result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              />
            </filter>
          </defs>
        )}
        <g
          filter={small ? undefined : `url(#${filterId})`}
          fill={fill}
          style={reduced ? { animation: "bubble-breathe 2.4s ease-in-out infinite" } : undefined}
        >
          <circle ref={coreRef} cx={size / 2} cy={size / 2} r={size * 0.15} />
          {Array.from({ length: count }).map((_, i) => (
            <circle
              key={i}
              ref={(el) => (blobRefs.current[i] = el)}
              cx={size / 2}
              cy={size / 2}
              r={size * 0.13}
              style={
                reduced
                  ? {
                      transform: `translate(${Math.cos((i / count) * 6.283) * size * 0.14}px, ${
                        Math.sin((i / count) * 6.283) * size * 0.14
                      }px)`,
                      transformOrigin: "center",
                    }
                  : undefined
              }
            />
          ))}
        </g>
      </svg>
      {labels.length > 0 && <CyclingLabel messages={labels} />}
    </div>
  );
}

/** Cycles through human-voice messages so the wait feels narrated, not stalled. */
function CyclingLabel({ messages }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % messages.length), 2200);
    return () => clearInterval(id);
  }, [messages.length]);
  return (
    <p key={i} className="text-dim font-mono text-sm text-center animate-fade-in">
      {messages[i]}
    </p>
  );
}

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
