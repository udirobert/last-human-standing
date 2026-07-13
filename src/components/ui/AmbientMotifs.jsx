import ThemeMotif from "./ThemeMotif.jsx";
import CoffeeBrew from "./CoffeeBrew.jsx";
import DozingCat from "./DozingCat.jsx";

/**
 * Quiet corner flourishes — same hand-painted artefacts as LandingHero,
 * dialed down so they don't fight content (docs/ART_DIRECTION.md).
 * Lives in AmbientBackdrop so the room stays human across shells
 * without smearing MotifFrieze onto every routine card.
 */
export default function AmbientMotifs({ density = "soft" }) {
  const opacity = density === "rich" ? 0.28 : 0.2;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute left-[2%] top-[12%]" style={{ opacity }}>
        <ThemeMotif emoji="🌳" size={density === "rich" ? 72 : 58} />
      </div>
      <div className="absolute right-[3%] bottom-[14%]" style={{ opacity }}>
        <DozingCat size={density === "rich" ? 72 : 56} />
      </div>
      <div className="hidden sm:block absolute right-[4%] top-[16%]" style={{ opacity: opacity * 0.95 }}>
        <CoffeeBrew size={density === "rich" ? 64 : 52} />
      </div>
      <div className="hidden md:block absolute left-[6%] bottom-[18%]" style={{ opacity: opacity * 0.9 }}>
        <ThemeMotif emoji="🍜" size={density === "rich" ? 60 : 48} />
      </div>
    </div>
  );
}
