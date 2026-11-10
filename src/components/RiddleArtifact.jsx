import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";

/**
 * RiddleArtifact — today's Meshy-generated specimen: a small 3D totem for
 * the active riddle, vendored under public/assets/meshy-days/<theme>/.
 *
 * The GLB renders through <model-viewer>, lazy-loaded from CDN only when
 * the card scrolls into view. The keyart plate is the poster/fallback, so
 * the card is fully usable offline or if the CDN is blocked. Game logic
 * never touches this — pure ceremony chrome.
 */

const DAY_ARTIFACTS = {
  1: { theme: "gathering", name: "Brass Café Token", blurb: "Struck for the regulars." },
  2: { theme: "wild", name: "Wildwood Staff", blurb: "Carved where the pavement ends." },
  3: { theme: "bond", name: "Bond Rings", blurb: "Two rings, one cord." },
  4: { theme: "quiet", name: "Silence Bell", blurb: "Rings for no one." },
  5: { theme: "dawn", name: "Dawn Vial", blurb: "Bottled first light." },
};

const MODEL_VIEWER_SRC =
  "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";

let mvPromise = null;
function loadModelViewer() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.customElements?.get("model-viewer")) return Promise.resolve(true);
  if (!mvPromise) {
    mvPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.type = "module";
      s.src = MODEL_VIEWER_SRC;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }
  return mvPromise;
}

export default function RiddleArtifact({ day, className = "" }) {
  const artifact = Number.isFinite(Number(day)) ? DAY_ARTIFACTS[Number(day)] : null;
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [mvReady, setMvReady] = useState(false);

  useEffect(() => {
    if (!artifact || inView) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [artifact, inView]);

  useEffect(() => {
    if (!inView || mvReady) return undefined;
    let cancelled = false;
    loadModelViewer().then((ok) => { if (!cancelled && ok) setMvReady(true); });
    return () => { cancelled = true; };
  }, [inView, mvReady]);

  if (!artifact) return null;

  const base = `/assets/meshy-days/${artifact.theme}`;
  const src = `${base}/artifact.glb`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
      className={`rounded-2xl border border-amber/30 bg-ash/50 overflow-hidden ${className}`}
    >
      <div className="relative h-44 bg-[#0d0b09]">
        {mvReady ? (
          <model-viewer
            src={src}
            alt={artifact.name}
            auto-rotate
            camera-controls
            rotation-per-second="12deg"
            shadow-intensity="1"
            exposure="1.1"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          />
        ) : (
          <img
            src={`${base}/keyart.jpg`}
            alt={artifact.name}
            className="h-full w-full object-cover opacity-80"
            loading="lazy"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d0b09] to-transparent pointer-events-none" />
        <div className="absolute left-3 bottom-2.5">
          <p className="font-mono text-[9px] text-amber/80 uppercase tracking-[0.2em]">Today&apos;s specimen</p>
          <p className="font-display text-lg text-bone leading-tight">{artifact.name}</p>
        </div>
      </div>
      <p className="px-3 py-2 font-body text-[11px] text-dim leading-snug">
        {artifact.blurb} ARIA wants proof — not the object itself.
      </p>
    </motion.div>
  );
}
