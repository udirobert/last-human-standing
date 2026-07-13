import { motion } from "framer-motion";
import ThemeMotif from "../components/ui/ThemeMotif.jsx";
import CoffeeBrew from "../components/ui/CoffeeBrew.jsx";
import DozingCat from "../components/ui/DozingCat.jsx";
import MotifFrieze from "../components/ui/MotifFrieze.jsx";
import EmberField from "../components/ui/EmberField.jsx";
import { CUE_PRESS, CUE_HOVER } from "../lib/cuelume.js";

const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Speed-run front door — same cold-machine / warm-human room as LandingHero
 * (docs/ART_DIRECTION.md). Brand first, one promise, one CTA, motifs in the air.
 * Meta (demo/skip/wallet) stays off this viewport.
 */
export default function SpeedRunIntro({ onStart, onExit, soundEnabled, onToggleSound }) {
  return (
    <section
      className="relative w-full flex-1"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        justifyItems: "center",
        alignItems: "center",
        minHeight: "100svh",
        background: "radial-gradient(130% 95% at 50% 0%, #4a3221 0%, #2e2013 45%, #1a120c 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ opacity: 0.05, mixBlendMode: "soft-light", backgroundImage: PAPER_GRAIN, backgroundSize: "300px 300px" }}
      />

      <div aria-hidden="true" className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        <EmberField cy={78} />
        <div className="absolute left-[3%] top-[18%]" style={{ opacity: 0.34 }}>
          <ThemeMotif emoji="🚌" size={88} />
        </div>
        <div className="absolute right-[4%] bottom-[12%]" style={{ opacity: 0.34 }}>
          <DozingCat size={88} />
        </div>
        <div className="hidden sm:block absolute right-[7%] top-[14%]" style={{ opacity: 0.3 }}>
          <CoffeeBrew size={76} />
        </div>
        <div className="hidden sm:block absolute left-[6%] bottom-[16%]" style={{ opacity: 0.3 }}>
          <ThemeMotif emoji="🌅" size={72} />
        </div>
      </div>

      {/* Whisper chrome — no demo badges */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-4 pointer-events-none">
        <span
          className="font-mono text-amber/80 uppercase pointer-events-none"
          style={{ fontSize: 10, letterSpacing: "0.18em" }}
        >
          Practice round
        </span>
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleSound}
            {...CUE_HOVER}
            data-cuelume-press="toggle"
            className="w-10 h-10 rounded-full flex items-center justify-center text-bone/55 hover:text-bone/90 hover:bg-bone/5 transition-colors"
            aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            title={soundEnabled ? "Mute" : "Unmute"}
          >
            <span className="text-sm" aria-hidden>{soundEnabled ? "♪" : "–"}</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            {...CUE_PRESS}
            className="w-10 h-10 rounded-full flex items-center justify-center text-bone/55 hover:text-bone/90 hover:bg-bone/5 transition-colors font-display text-xl leading-none"
            aria-label="Exit speed run"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="relative z-[2]"
        style={{ width: "100%", maxWidth: 720, padding: "clamp(56px,8vw,80px) 20px clamp(36px,6vw,56px)", textAlign: "center" }}
      >
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="font-mono text-amber/90 uppercase"
          style={{ fontSize: "clamp(10px,1.4vw,13px)", letterSpacing: "0.16em" }}
        >
          Feel the week before it starts
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06, ease: [0.23, 1, 0.32, 1] }}
          className="font-display text-bone"
          style={{
            fontSize: "clamp(48px,11vw,120px)",
            lineHeight: 0.82,
            letterSpacing: "0.02em",
            marginTop: "clamp(14px,2vw,22px)",
            textShadow: "0 0 60px rgba(255,184,0,0.12)",
          }}
        >
          LAST HUMAN
          <br />
          STANDING
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.23, 1, 0.32, 1] }}
          className="font-body text-bone/90"
          style={{
            fontSize: "clamp(15px,2vw,20px)",
            lineHeight: 1.5,
            maxWidth: "min(28rem, calc(100vw - 44px))",
            margin: "clamp(16px,2vw,22px) auto 0",
          }}
        >
          Five compressed days. Theme, proof, audit, cut — until one human
          remains.{" "}
          <b className="text-amber font-semibold">You&apos;re the only real player.</b>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.22 }}
        >
          <MotifFrieze className="w-full" style={{ marginTop: "clamp(22px,3vw,34px)" }} />
          <p className="font-mono text-dim uppercase mt-2.5" style={{ fontSize: 11, letterSpacing: "0.14em" }}>
            the little proofs you&apos;re human
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          style={{ marginTop: "clamp(24px,3vw,34px)" }}
        >
          <button
            type="button"
            onClick={onStart}
            {...CUE_PRESS}
            className="font-body font-semibold text-[#1a1206] bg-amber rounded-2xl px-8 py-4 active:scale-[0.97] transition-transform"
            style={{ fontSize: "clamp(15px,1.6vw,17px)", boxShadow: "0 10px 30px -8px rgba(255,184,0,0.5)" }}
          >
            Step into day one →
          </button>
          <p className="font-mono text-dim mt-4" style={{ fontSize: 11, letterSpacing: "0.06em" }}>
            About ten minutes · no wallet · nowhere live yet
          </p>
        </motion.div>
      </div>
    </section>
  );
}
