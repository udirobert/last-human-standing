import ThemeMotif from "./ThemeMotif.jsx";
import DozingCat from "./DozingCat.jsx";

/**
 * MotifFrieze — a warm row of hand-painted everyday-human moments
 * (docs/ART_DIRECTION.md). Its whole job is to put the human language on the
 * FIRST screen a visitor sees, so the app doesn't read as a cold machine before
 * anyone reaches the live game. It doubles as a preview of the daily themes:
 * these are the little proofs of being human the game is built on.
 *
 * A soft warm glow lights them from below and a faint shelf grounds them, so
 * the cluster reads as a lovingly-arranged still life, not a row of icons.
 */
export default function MotifFrieze({ className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {/* warm light pooling under the shelf */}
      <div className="absolute inset-x-4 bottom-1 h-14 bg-amber/15 blur-2xl rounded-full pointer-events-none" />
      <div className="relative flex items-end justify-center gap-1">
        <ThemeMotif emoji="🌅" size={44} label="sunrise" />
        <ThemeMotif emoji="☕" size={52} label="coffee" />
        <DozingCat size={50} />
        <ThemeMotif emoji="🌳" size={50} label="a park" />
        <ThemeMotif emoji="🍜" size={46} label="a warm meal" />
      </div>
      {/* hand-drawn shelf line */}
      <div className="mx-auto mt-1 h-[2px] w-3/4 rounded-full bg-gradient-to-r from-transparent via-amber/30 to-transparent" />
    </div>
  );
}
