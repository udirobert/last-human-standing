import { motion, useReducedMotion } from "framer-motion";
import ThemeMotif from "./ThemeMotif.jsx";
import CoffeeBrew from "./CoffeeBrew.jsx";
import DozingCat from "./DozingCat.jsx";
import FoldedNote from "./FoldedNote.jsx";
import WiltingPlant from "./WiltingPlant.jsx";
import EmberSeeds from "./EmberSeeds.jsx";

/**
 * Quiet corner flourishes — max two per day (Manus backdrop pass).
 * One familiar motif + one smaller peripheral flourish.
 */

const DAY_SETS = {
  1: [
    { kind: "coffee", corner: "tr", size: 52 },
    { kind: "emoji", emoji: "🌅", corner: "bl", size: 46 },
  ],
  2: [
    { kind: "emoji", emoji: "🌳", corner: "tl", size: 58 },
    { kind: "note", corner: "br", size: 40 },
  ],
  3: [
    { kind: "coffee", corner: "tr", size: 50 },
    { kind: "emoji", emoji: "🤝", corner: "bl", size: 48 },
  ],
  4: [
    { kind: "emoji", emoji: "📚", corner: "tl", size: 56 },
    { kind: "plant", corner: "br", size: 44 },
  ],
  5: [
    { kind: "emoji", emoji: "🌅", corner: "tr", size: 58 },
    { kind: "embers", corner: "bl", size: 34 },
  ],
};

const DEFAULT_SET = [
  { kind: "emoji", emoji: "🌳", corner: "tl", size: 56 },
  { kind: "cat", corner: "br", size: 52 },
];

const CORNER_CLASS = {
  tl: "left-[2%] top-[12%]",
  tr: "right-[3%] top-[14%]",
  bl: "left-[4%] bottom-[16%]",
  br: "right-[3%] bottom-[14%]",
};

function MotifNode({ item }) {
  if (item.kind === "coffee") return <CoffeeBrew size={item.size} />;
  if (item.kind === "cat") return <DozingCat size={item.size} />;
  if (item.kind === "note") return <FoldedNote size={item.size} />;
  if (item.kind === "plant") return <WiltingPlant size={item.size} />;
  if (item.kind === "embers") return <EmberSeeds size={item.size} />;
  return <ThemeMotif emoji={item.emoji} size={item.size} />;
}

export default function AmbientMotifs({ density = "soft", day = null }) {
  const reduceMotion = useReducedMotion();
  const opacity = density === "rich" ? 0.3 : 0.2;
  const set = (day != null && DAY_SETS[day]) || DEFAULT_SET;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {set.map((item, i) => {
        const pos = CORNER_CLASS[item.corner] || CORNER_CLASS.tl;
        return (
          <motion.div
            key={`${day ?? "default"}-${item.corner}-${i}`}
            className={`absolute ${pos}`}
            style={{ opacity }}
            animate={
              reduceMotion
                ? { y: 0 }
                : { y: [0, i % 2 === 0 ? -5 : 4, 0] }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 11 + i * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.9,
                  }
            }
          >
            <MotifNode item={item} />
          </motion.div>
        );
      })}
    </div>
  );
}
