import { DAILY_THEMES } from "../../data/game";
import ThemeMotif from "./ThemeMotif.jsx";

/**
 * DailyProofs — the daily-theme wheel for the landing narrative
 * (docs/ART_DIRECTION.md). Every morning a new real-world theme drops; this
 * shows the whole hand-painted deck, so a visitor instantly *gets* the game
 * (snap a proof of an everyday human moment) and — crucially — sees the painted
 * theme motifs before launch, when the in-game check-in card is unreachable.
 *
 * Responsive: a 2-up grid on phones, up to 5-up on desktop.
 */

// Short, warm labels (the raw themes are shouty all-caps "AT A …").
const SHORT = {
  "AT A CAFÉ": "a café",
  "AT A PARK": "a park",
  "AT A GYM": "the gym",
  "WITH A FRIEND": "a friend",
  "OUTSIDE AT SUNRISE": "sunrise",
  "AT A BOOKSTORE": "a bookstore",
  "EATING SOMETHING": "a meal",
  "ON PUBLIC TRANSIT": "transit",
  "AT A GROCERY STORE": "groceries",
  "AT A BEACH OR WATER": "the water",
};

export default function DailyProofs() {
  return (
    <section className="w-full max-w-[860px] mx-auto px-5">
      <div className="text-center mb-6">
        <p className="font-mono text-amber/90 uppercase text-[11px] tracking-[0.2em]">Every morning</p>
        <h2 className="font-display text-bone tracking-wide mt-1" style={{ fontSize: "clamp(30px,5vw,52px)", lineHeight: 0.95 }}>
          A new proof you're human
        </h2>
        <p className="font-body text-dim text-sm sm:text-base mt-2 max-w-md mx-auto">
          A real-world theme drops each day. Snap your proof from anywhere on Earth — the crowd decides if you're the
          real thing.
        </p>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 list-none p-0 m-0">
        {DAILY_THEMES.map((t) => (
          <li
            key={t.id}
            className="flex flex-col items-center justify-end gap-1.5 rounded-2xl bg-smoke/50 border border-ember/40 py-4 px-2"
          >
            <ThemeMotif emoji={t.emoji} size={56} label={t.theme} />
            <span className="font-mono text-dim text-[10px] tracking-widest uppercase text-center leading-tight">
              {SHORT[t.theme] || t.theme}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
