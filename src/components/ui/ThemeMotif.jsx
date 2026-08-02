import { useId } from "react";
import GouacheFilters from "./GouacheFilters.jsx";
import { GOUACHE as P } from "./gouachePalette.js";
import CoffeeBrew from "./CoffeeBrew.jsx";

/**
 * ThemeMotif — the hand-painted artefact for each daily check-in theme
 * (docs/ART_DIRECTION.md). One family, one hand: every motif shares
 * GouacheFilters + the gouache palette, so the whole theme wheel feels made by
 * the same person. Drop-in for the theme card — for a theme we haven't painted
 * yet it simply falls back to rendering the emoji, so nothing ever breaks.
 *
 * Each motif is a function (uid) => JSX inside a 120×120 viewBox, brush-wobbled
 * and grained via the shared filters. Coffee (the calibration hero) delegates to
 * its own richer component.
 */

const shadow = (uid) => (
  <ellipse cx="60" cy="110" rx="34" ry="6" fill="#000" opacity="0.32" filter={`url(#${uid}-shadow)`} />
);

const MOTIFS = {
  // AT A PARK — a tree
  "🌳": (uid) => (
    <>
      <clipPath id={`${uid}-c`}><circle cx="60" cy="48" r="34" /></clipPath>
      <g filter={`url(#${uid}-brush)`}>
        <rect x="54" y="66" width="12" height="34" rx="3" fill={P.crema} />
        {/* crown sways gently around the trunk base (.motif-sway) */}
        <g className="motif-sway">
          <circle cx="60" cy="46" r="30" fill={P.leaf} />
          <circle cx="40" cy="56" r="20" fill={P.leaf} />
          <circle cx="82" cy="56" r="19" fill={P.leaf} />
          <circle cx="70" cy="40" r="16" fill={P.leafShade} opacity="0.45" />
        </g>
        <g clipPath={`url(#${uid}-c)`}>
          <rect x="20" y="12" width="80" height="72" filter={`url(#${uid}-grain)`} opacity="0.5" />
        </g>
      </g>
    </>
  ),
  // AT A GYM — a dumbbell
  "🏋️": (uid) => (
    <g filter={`url(#${uid}-brush)`} transform="rotate(-14 60 60)">
      <rect x="28" y="54" width="64" height="11" rx="5" fill={P.ironLight} />
      <rect x="20" y="44" width="13" height="31" rx="5" fill={P.iron} />
      <rect x="87" y="44" width="13" height="31" rx="5" fill={P.iron} />
      <rect x="34" y="48" width="8" height="23" rx="4" fill={P.iron} />
      <rect x="78" y="48" width="8" height="23" rx="4" fill={P.iron} />
    </g>
  ),
  // WITH A FRIEND — coffee for two
  "🤝": (uid) => (
    <g filter={`url(#${uid}-brush)`}>
      <g fill="none" stroke={P.foam} strokeWidth="3" strokeLinecap="round" opacity="0.5">
          <path className="steam-b" d="M44,46 C40,40 48,38 45,32" />
          <path className="steam-c" d="M77,50 C73,44 81,42 78,36" />
        </g>
      <g>
        <path d="M30,52 L58,52 L55,86 C55,90 33,90 33,86 Z" fill={P.cream} />
        <ellipse cx="44" cy="52" rx="14" ry="3.6" fill={P.espresso} />
        <path d="M30,58 C20,56 20,74 31,74" fill="none" stroke={P.cream} strokeWidth="4.5" />
      </g>
      <g>
        <path d="M62,56 L92,56 L89,90 C89,94 65,94 65,90 Z" fill={P.cream} />
        <ellipse cx="77" cy="56" rx="15" ry="3.8" fill={P.espresso} />
        <path d="M92,62 C102,60 102,78 91,78" fill="none" stroke={P.cream} strokeWidth="4.5" />
      </g>
    </g>
  ),
  // OUTSIDE AT SUNRISE — a rising sun
  "🌅": (uid) => (
    <>
      <clipPath id={`${uid}-c`}><circle cx="60" cy="58" r="26" /></clipPath>
      <g filter={`url(#${uid}-brush)`}>
        {/* rays pulse like strengthening first light (.motif-rays) */}
        <g className="motif-rays" stroke={P.sun} strokeWidth="4" strokeLinecap="round" opacity="0.85">
          <path d="M60,22 L60,12" />
          <path d="M36,30 L30,22" />
          <path d="M84,30 L90,22" />
          <path d="M22,50 L12,48" />
          <path d="M98,50 L108,48" />
        </g>
        {/* the disc itself does the gentlest possible rising bob (.motif-bob) */}
        <g className="motif-bob">
          <circle cx="60" cy="58" r="26" fill={P.petal} />
          <circle cx="60" cy="58" r="26" fill={P.sun} opacity="0.35" />
          <g clipPath={`url(#${uid}-c)`}>
            <rect x="34" y="32" width="52" height="52" filter={`url(#${uid}-grain)`} opacity="0.4" />
          </g>
        </g>
        <rect x="8" y="72" width="104" height="34" fill={P.terracotta} />
        <path d="M8,72 L112,72" stroke={P.terracottaShade} strokeWidth="2" />
      </g>
    </>
  ),
  // AT A BOOKSTORE — a stack of books
  "📚": (uid) => (
    <g filter={`url(#${uid}-brush)`}>
      <g transform="rotate(-3 60 82)">
        <rect x="30" y="76" width="60" height="14" rx="2" fill={P.terracotta} />
        <rect x="30" y="76" width="7" height="14" fill={P.terracottaShade} />
      </g>
      <g transform="rotate(2 60 66)">
        <rect x="34" y="61" width="54" height="13" rx="2" fill={P.leaf} />
        <rect x="34" y="61" width="7" height="13" fill={P.leafShade} />
      </g>
      <g transform="rotate(-2 60 52)">
        <rect x="32" y="47" width="58" height="13" rx="2" fill={P.petal} />
        <rect x="32" y="47" width="7" height="13" fill={P.petalShade} />
      </g>
    </g>
  ),
  // EATING SOMETHING — a steaming noodle bowl
  "🍜": (uid) => (
    <>
      <clipPath id={`${uid}-c`}><path d="M30,63 C32,86 88,86 90,63 Z" /></clipPath>
      <g filter={`url(#${uid}-brush)`}>
        {/* steam rises off the bowl — same wisps as the coffee (.steam-a/b) */}
        <g fill="none" stroke={P.foam} strokeWidth="3.5" strokeLinecap="round" opacity="0.55">
          <path className="steam-a" d="M50,54 C46,44 54,40 51,32" />
          <path className="steam-b" d="M64,54 C68,44 60,40 63,32" />
        </g>
        <path d="M30,63 C32,86 88,86 90,63 Z" fill={P.cream} />
        <ellipse cx="60" cy="63" rx="30" ry="7" fill={P.rim} />
        <ellipse cx="60" cy="63" rx="25" ry="5.5" fill={P.bud} />
        <path d="M46,61 C52,54 68,54 74,61" fill="none" stroke={P.foam} strokeWidth="3" />
        <circle cx="52" cy="62" r="3" fill={P.leaf} />
        <g stroke={P.terracottaShade} strokeWidth="3" strokeLinecap="round">
          <path d="M66,60 L98,34" />
          <path d="M62,60 L96,40" />
        </g>
        <g clipPath={`url(#${uid}-c)`}>
          <rect x="30" y="56" width="60" height="30" filter={`url(#${uid}-grain)`} opacity="0.5" />
        </g>
      </g>
    </>
  ),
  // ON PUBLIC TRANSIT — a little bus
  "🚇": (uid) => (
    <>
      <clipPath id={`${uid}-c`}><rect x="26" y="40" width="68" height="46" rx="10" /></clipPath>
      <g filter={`url(#${uid}-brush)`}>
        <rect x="26" y="40" width="68" height="46" rx="10" fill={P.petal} />
        <rect x="26" y="40" width="68" height="15" rx="8" fill={P.petalShade} opacity="0.5" />
        <rect x="32" y="58" width="22" height="14" rx="3" fill={P.espresso} />
        <rect x="66" y="58" width="22" height="14" rx="3" fill={P.espresso} />
        <rect x="58" y="58" width="4" height="14" fill={P.petalShade} />
        <circle cx="42" cy="88" r="7" fill={P.iron} />
        <circle cx="78" cy="88" r="7" fill={P.iron} />
        <g clipPath={`url(#${uid}-c)`}>
          <rect x="26" y="40" width="68" height="46" filter={`url(#${uid}-grain)`} opacity="0.45" />
        </g>
      </g>
    </>
  ),
  // AT A GROCERY STORE — a paper bag of produce
  "🛒": (uid) => (
    <>
      <clipPath id={`${uid}-c`}><path d="M34,54 L86,54 L82,98 C82,101 38,101 38,98 Z" /></clipPath>
      <g filter={`url(#${uid}-brush)`}>
        <path d="M42,44 C48,52 72,52 78,44" fill="none" stroke={P.leaf} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="52" cy="46" rx="8" ry="10" fill={P.terracotta} />
        <path d="M34,54 L86,54 L82,98 C82,101 38,101 38,98 Z" fill={P.cream} />
        <path d="M60,54 L86,54 L82,98 C82,100 70,101 60,101 Z" fill={P.paper} opacity="0.6" />
        <path d="M34,58 L86,58" stroke={P.rim} strokeWidth="2" />
        <g clipPath={`url(#${uid}-c)`}>
          <rect x="34" y="54" width="52" height="48" filter={`url(#${uid}-grain)`} opacity="0.55" />
        </g>
      </g>
    </>
  ),
  // AT A BEACH OR WATER — a paper boat on a wave
  "🌊": (uid) => (
    <g filter={`url(#${uid}-brush)`}>
      <path d="M18,74 C34,60 44,82 60,74 C76,66 86,84 102,74 L102,96 L18,96 Z" fill={P.water} />
      <path
        d="M18,74 C34,60 44,82 60,74 C76,66 86,84 102,74"
        fill="none"
        stroke={P.foam}
        strokeWidth="3"
        opacity="0.75"
      />
      <g transform="translate(0,-6)">
        <path d="M46,64 L74,64 L66,75 L54,75 Z" fill={P.foam} />
        <path d="M61,64 L61,44 L76,64 Z" fill={P.cream} />
        <path d="M59,64 L59,44 L44,64 Z" fill={P.paper} />
      </g>
    </g>
  ),
  // QUEUED / OFFLINE SIGNAL — warm concentric arcs (not a glyph antenna)
  "📡": (uid) => (
    <g filter={`url(#${uid}-brush)`}>
      <circle cx="60" cy="72" r="7" fill={P.petal} />
      <path
        d="M42,58 C48,48 72,48 78,58"
        fill="none"
        stroke={P.sun}
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M32,46 C42,30 78,30 88,46"
        fill="none"
        stroke={P.petal}
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M24,34 C40,14 80,14 96,34"
        fill="none"
        stroke={P.cream}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </g>
  ),
};

export default function ThemeMotif({ emoji, size = 64, className = "", label }) {
  const uid = useId().replace(/:/g, "");

  // Coffee is the calibration hero — delegate to its richer component.
  if (emoji === "☕") return <CoffeeBrew size={size} className={className} />;

  const draw = MOTIFS[emoji];
  if (!draw) {
    // Not painted yet — fall back to the emoji so the card still reads.
    return (
      <span className={className} style={{ fontSize: size * 0.6, lineHeight: 1 }} role="img" aria-label={label}>
        {emoji}
      </span>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={`motif-idle ${className}`} role="img" aria-label={label}>
      <defs>
        <GouacheFilters id={uid} />
      </defs>
      {shadow(uid)}
      {draw(uid)}
    </svg>
  );
}
