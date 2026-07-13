/**
 * Proof scene data utilities — split from ProofScene.jsx for fast refresh.
 * Contains the data URI generator and theme→scene mapping.
 */

/**
 * Map theme emoji → scene type.
 */
const THEME_SCENE_MAP = {
  "☕": "cafe",
  "🌳": "park",
  "🏋️": "gym",
  "🤝": "cafe", // friend → cafe scene
  "🌅": "beach", // sunrise → beach/water
  "📚": "default", // bookstore → default room
  "🍜": "eating",
  "🚇": "transit",
  "🛒": "grocery",
  "🌊": "beach",
};

export function getSceneForTheme(themeEmoji) {
  return THEME_SCENE_MAP[themeEmoji] || "default";
}

/**
 * Generate a data URI for a proof scene — for use as <img src>.
 * Returns a self-contained SVG string suitable for <img src={...}>.
 * This replaces the Unsplash hotlinks with on-brand gouache scenes.
 */
export function proofSceneDataUri({ scene = "default", seed = 0, width = 400, height = 500 }) {
  const scenePaths = {
    transit: `<g filter="url(#brush)">
      <!-- ceiling lights -->
      <circle cx="100" cy="60" r="8" fill="#FFB800" opacity="0.15"/>
      <circle cx="100" cy="60" r="4" fill="#FFB800" opacity="0.4"/>
      <circle cx="300" cy="60" r="8" fill="#FFB800" opacity="0.15"/>
      <circle cx="300" cy="60" r="4" fill="#FFB800" opacity="0.4"/>
      <!-- platform floor with tile lines -->
      <rect x="0" y="320" width="400" height="180" fill="#4A3F36" opacity="0.8"/>
      <line x1="0" y1="350" x2="400" y2="350" stroke="#6B5A4A" stroke-width="1.5" opacity="0.4"/>
      <line x1="0" y1="380" x2="400" y2="380" stroke="#6B5A4A" stroke-width="1.5" opacity="0.3"/>
      <line x1="0" y1="420" x2="400" y2="420" stroke="#6B5A4A" stroke-width="1.5" opacity="0.3"/>
      <!-- safety strip -->
      <rect x="0" y="315" width="400" height="6" fill="#C67A4B" opacity="0.5"/>
      <!-- train body -->
      <rect x="40" y="140" width="320" height="180" rx="20" fill="#F4B84A"/>
      <rect x="40" y="140" width="320" height="50" rx="18" fill="#D9922E" opacity="0.4"/>
      <!-- train stripe -->
      <rect x="40" y="195" width="320" height="4" fill="#A85F38" opacity="0.6"/>
      <!-- windows with reflections -->
      <rect x="70" y="180" width="80" height="50" rx="6" fill="#3B2417" opacity="0.7"/>
      <rect x="72" y="182" width="30" height="20" rx="3" fill="#EFE2C8" opacity="0.15"/>
      <rect x="170" y="180" width="80" height="50" rx="6" fill="#3B2417" opacity="0.7"/>
      <rect x="172" y="182" width="30" height="20" rx="3" fill="#EFE2C8" opacity="0.15"/>
      <rect x="270" y="180" width="80" height="50" rx="6" fill="#3B2417" opacity="0.7"/>
      <rect x="272" y="182" width="30" height="20" rx="3" fill="#EFE2C8" opacity="0.15"/>
      <!-- door -->
      <rect x="200" y="240" width="40" height="80" rx="4" fill="#A85F38" opacity="0.6"/>
      <line x1="220" y1="245" x2="220" y2="315" stroke="#6B4526" stroke-width="1.5" opacity="0.5"/>
      <!-- figure on platform — a person waiting -->
      <g transform="translate(140, 280)">
        <ellipse cx="0" cy="50" rx="12" ry="4" fill="#000" opacity="0.3"/>
        <circle cx="0" cy="0" r="8" fill="#C99A5A"/>
        <path d="M-6,8 Q-8,30 -4,48 L4,48 Q8,30 6,8 Z" fill="#7B9E5A"/>
        <line x1="-6" y1="14" x2="-12" y2="30" stroke="#C99A5A" stroke-width="4" stroke-linecap="round"/>
        <line x1="6" y1="14" x2="12" y2="30" stroke="#C99A5A" stroke-width="4" stroke-linecap="round"/>
      </g>
      <!-- tracks -->
      <line x1="0" y1="340" x2="400" y2="340" stroke="#E7DDC6" stroke-width="2" opacity="0.2"/>
      <line x1="0" y1="360" x2="400" y2="360" stroke="#E7DDC6" stroke-width="2" opacity="0.2"/>
    </g>`,
    gym: `<g filter="url(#brush)">
      <!-- wall -->
      <rect x="0" y="0" width="400" height="340" fill="#3B2417" opacity="0.08"/>
      <!-- floor with texture -->
      <rect x="0" y="340" width="400" height="160" fill="#E7DDC6" opacity="0.3"/>
      <line x1="0" y1="370" x2="400" y2="370" stroke="#C9B892" stroke-width="1" opacity="0.3"/>
      <line x1="0" y1="410" x2="400" y2="410" stroke="#C9B892" stroke-width="1" opacity="0.3"/>
      <!-- mirror with reflection -->
      <rect x="250" y="60" width="120" height="160" rx="6" fill="#6BA8B0" opacity="0.15"/>
      <rect x="250" y="60" width="120" height="160" rx="6" fill="none" stroke="#E7DDC6" stroke-width="3" opacity="0.3"/>
      <!-- mirror reflection — a figure -->
      <g transform="translate(300, 120)" opacity="0.2">
        <circle cx="0" cy="0" r="10" fill="#C99A5A"/>
        <path d="M-8,10 Q-10,40 -6,70 L6,70 Q10,40 8,10 Z" fill="#C67A4B"/>
      </g>
      <!-- rack -->
      <rect x="120" y="200" width="160" height="12" rx="3" fill="#7A6A58"/>
      <rect x="100" y="180" width="14" height="60" rx="4" fill="#4A3F36"/>
      <rect x="286" y="180" width="14" height="60" rx="4" fill="#4A3F36"/>
      <!-- barbell -->
      <rect x="80" y="195" width="240" height="8" rx="3" fill="#4A3F36"/>
      <rect x="70" y="185" width="22" height="28" rx="5" fill="#4A3F36"/>
      <rect x="308" y="185" width="22" height="28" rx="5" fill="#4A3F36"/>
      <!-- plates with detail -->
      <circle cx="110" cy="199" r="20" fill="#4A3F36" opacity="0.8"/>
      <circle cx="110" cy="199" r="14" fill="#3B2417" opacity="0.6"/>
      <circle cx="110" cy="199" r="6" fill="#4A3F36"/>
      <circle cx="290" cy="199" r="20" fill="#4A3F36" opacity="0.8"/>
      <circle cx="290" cy="199" r="14" fill="#3B2417" opacity="0.6"/>
      <circle cx="290" cy="199" r="6" fill="#4A3F36"/>
      <!-- figure lifting -->
      <g transform="translate(200, 260)">
        <ellipse cx="0" cy="60" rx="14" ry="4" fill="#000" opacity="0.3"/>
        <circle cx="0" cy="0" r="10" fill="#C99A5A"/>
        <path d="M-8,10 Q-10,35 -6,58 L6,58 Q10,35 8,10 Z" fill="#A85F38"/>
        <!-- arms reaching up to bar -->
        <line x1="-8" y1="14" x2="-14" y2="-20" stroke="#C99A5A" stroke-width="5" stroke-linecap="round"/>
        <line x1="8" y1="14" x2="14" y2="-20" stroke="#C99A5A" stroke-width="5" stroke-linecap="round"/>
      </g>
      <!-- dumbbell on floor -->
      <rect x="40" y="380" width="50" height="6" rx="2" fill="#4A3F36"/>
      <circle cx="42" cy="383" r="8" fill="#4A3F36"/>
      <circle cx="88" cy="383" r="8" fill="#4A3F36"/>
    </g>`,
    grocery: `<g filter="url(#brush)">
      <!-- ceiling -->
      <rect x="0" y="0" width="400" height="100" fill="#3B2417" opacity="0.06"/>
      <!-- fluorescent light -->
      <rect x="150" y="30" width="100" height="6" rx="3" fill="#FFB800" opacity="0.2"/>
      <!-- shelves -->
      <rect x="0" y="100" width="400" height="8" fill="#6B4526" opacity="0.6"/>
      <rect x="0" y="220" width="400" height="8" fill="#6B4526" opacity="0.6"/>
      <rect x="0" y="100" width="400" height="120" fill="#4A3F36" opacity="0.05"/>
      <!-- produce — tomatoes with stems -->
      <circle cx="60" cy="140" r="18" fill="#C67A4B"/>
      <circle cx="58" cy="138" r="6" fill="#D9922E" opacity="0.5"/>
      <path d="M58,122 L62,118 L66,122" stroke="#7B9E5A" stroke-width="2" fill="none"/>
      <circle cx="100" cy="145" r="16" fill="#A85F38"/>
      <circle cx="98" cy="143" r="5" fill="#C67A4B" opacity="0.5"/>
      <circle cx="140" cy="138" r="18" fill="#C67A4B"/>
      <path d="M138,122 L142,118" stroke="#7B9E5A" stroke-width="2" fill="none"/>
      <!-- produce — greens -->
      <ellipse cx="220" cy="145" rx="22" ry="14" fill="#7B9E5A"/>
      <ellipse cx="218" cy="142" rx="14" ry="8" fill="#9BB87A" opacity="0.5"/>
      <ellipse cx="260" cy="140" rx="20" ry="12" fill="#5E7E42"/>
      <ellipse cx="258" cy="138" rx="12" ry="6" fill="#7B9E5A" opacity="0.5"/>
      <!-- paper bag with fold -->
      <path d="M300,120 L360,120 L355,200 C355,205 305,205 305,200 Z" fill="#E7DDC6"/>
      <path d="M300,120 L360,120 L355,200 C355,205 305,205 305,200 Z" fill="#D9CBAA" opacity="0.3"/>
      <path d="M300,120 Q330,115 360,120" fill="none" stroke="#C9B892" stroke-width="2"/>
      <!-- shelf items — jars with labels -->
      <rect x="50" y="250" width="30" height="50" rx="4" fill="#F4B84A" opacity="0.7"/>
      <rect x="55" y="265" width="20" height="15" fill="#E7DDC6" opacity="0.5"/>
      <rect x="90" y="250" width="30" height="50" rx="4" fill="#7B9E5A" opacity="0.6"/>
      <rect x="95" y="265" width="20" height="15" fill="#E7DDC6" opacity="0.5"/>
      <rect x="130" y="250" width="30" height="50" rx="4" fill="#C67A4B" opacity="0.7"/>
      <rect x="135" y="265" width="20" height="15" fill="#E7DDC6" opacity="0.5"/>
      <!-- figure with cart -->
      <g transform="translate(220, 320)">
        <ellipse cx="0" cy="70" rx="16" ry="4" fill="#000" opacity="0.3"/>
        <circle cx="0" cy="10" r="9" fill="#C99A5A"/>
        <path d="M-7,18 Q-9,45 -5,68 L5,68 Q9,45 7,18 Z" fill="#6BA8B0"/>
        <!-- cart -->
        <rect x="15" y="30" width="40" height="25" rx="3" fill="#4A3F36" opacity="0.6"/>
        <circle cx="22" cy="60" r="6" fill="#4A3F36"/>
        <circle cx="48" cy="60" r="6" fill="#4A3F36"/>
      </g>
    </g>`,
    beach: `<g filter="url(#brush)">
      <!-- sky gradient layers -->
      <rect x="0" y="0" width="400" height="280" fill="#F4B84A" opacity="0.15"/>
      <rect x="0" y="0" width="400" height="140" fill="#FFB800" opacity="0.08"/>
      <!-- sun with glow rings -->
      <circle cx="300" cy="80" r="45" fill="#FFB800" opacity="0.15"/>
      <circle cx="300" cy="80" r="30" fill="#FFB800" opacity="0.3"/>
      <circle cx="300" cy="80" r="18" fill="#FFB800" opacity="0.6"/>
      <!-- distant clouds -->
      <ellipse cx="80" cy="70" rx="40" ry="12" fill="#EFE2C8" opacity="0.2"/>
      <ellipse cx="180" cy="50" rx="50" ry="10" fill="#EFE2C8" opacity="0.15"/>
      <!-- sea with depth layers -->
      <path d="M0,260 C80,250 160,270 240,260 C320,250 360,265 400,258 L400,360 L0,360 Z" fill="#6BA8B0"/>
      <path d="M0,280 C80,270 160,290 240,280 C320,270 360,285 400,278 L400,360 L0,360 Z" fill="#5A98A0" opacity="0.5"/>
      <!-- waves -->
      <path d="M0,270 C80,260 160,280 240,270 C320,260 360,275 400,268" fill="none" stroke="#EFE2C8" stroke-width="3" opacity="0.6"/>
      <path d="M40,285 C100,278 180,290 260,283 C320,278 360,288 400,281" fill="none" stroke="#EFE2C8" stroke-width="2" opacity="0.4"/>
      <!-- sand with texture -->
      <path d="M0,340 C80,335 160,345 240,338 C320,333 360,343 400,336 L400,500 L0,500 Z" fill="#E7DDC6" opacity="0.6"/>
      <path d="M0,355 C80,350 160,360 240,353 C320,348 360,358 400,351 L400,500 L0,500 Z" fill="#D9CBAA" opacity="0.3"/>
      <!-- sand specks -->
      <circle cx="50" cy="380" r="2" fill="#C9B892" opacity="0.5"/>
      <circle cx="120" cy="400" r="1.5" fill="#C9B892" opacity="0.4"/>
      <circle cx="280" cy="390" r="2" fill="#C9B892" opacity="0.5"/>
      <circle cx="350" cy="410" r="1.5" fill="#C9B892" opacity="0.4"/>
      <!-- paper boat with mast -->
      <g transform="translate(150, 310)">
        <path d="M0,0 L40,0 L32,12 L8,12 Z" fill="#EFE2C8"/>
        <path d="M20,0 L20,-25 L38,0 Z" fill="#E7DDC6"/>
        <path d="M18,0 L18,-25 L2,0 Z" fill="#D9CBAA"/>
        <line x1="20" y1="-25" x2="20" y2="0" stroke="#6B4526" stroke-width="1.5"/>
      </g>
      <!-- figure standing in water -->
      <g transform="translate(260, 300)">
        <circle cx="0" cy="0" r="8" fill="#C99A5A"/>
        <path d="M-6,8 Q-8,25 -4,40 L4,40 Q8,25 6,8 Z" fill="#A85F38"/>
        <!-- legs in water -->
        <line x1="-3" y1="40" x2="-3" y2="55" stroke="#C99A5A" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
        <line x1="3" y1="40" x2="3" y2="55" stroke="#C99A5A" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      </g>
      <!-- footprint in sand -->
      <ellipse cx="100" cy="420" rx="6" ry="3" fill="#C9B892" opacity="0.4"/>
      <ellipse cx="115" cy="430" rx="6" ry="3" fill="#C9B892" opacity="0.4"/>
    </g>`,
    eating: `<g filter="url(#brush)">
      <!-- table surface with wood grain -->
      <rect x="0" y="300" width="400" height="200" fill="#6B4526" opacity="0.3"/>
      <line x1="0" y1="330" x2="400" y2="330" stroke="#4A3F36" stroke-width="1" opacity="0.2"/>
      <line x1="0" y1="380" x2="400" y2="380" stroke="#4A3F36" stroke-width="1" opacity="0.15"/>
      <line x1="0" y1="430" x2="400" y2="430" stroke="#4A3F36" stroke-width="1" opacity="0.15"/>
      <!-- steam -->
      <g fill="none" stroke="#EFE2C8" stroke-width="3" stroke-linecap="round" opacity="0.5">
        <path d="M170,180 C165,165 175,160 170,145 C165,130 175,125 170,110"/>
        <path d="M200,180 C205,165 195,160 200,145 C205,130 195,125 200,110"/>
        <path d="M230,180 C225,165 235,160 230,145 C225,130 235,125 230,110"/>
      </g>
      <!-- bowl with depth -->
      <path d="M140,220 C145,290 255,290 260,220 Z" fill="#E7DDC6"/>
      <path d="M145,225 C150,285 250,285 255,225 Z" fill="#D9CBAA" opacity="0.3"/>
      <ellipse cx="200" cy="220" rx="60" ry="14" fill="#C9B892"/>
      <ellipse cx="200" cy="220" rx="50" ry="10" fill="#C99A5A"/>
      <!-- noodles with detail -->
      <path d="M175,218 C185,210 215,210 225,218" fill="none" stroke="#EFE2C8" stroke-width="3"/>
      <path d="M180,222 C190,214 210,214 220,222" fill="none" stroke="#EFE2C8" stroke-width="2.5"/>
      <path d="M178,215 C188,207 208,207 218,215" fill="none" stroke="#E7DDC6" stroke-width="2" opacity="0.7"/>
      <!-- garnish -->
      <circle cx="190" cy="218" r="4" fill="#7B9E5A"/>
      <circle cx="210" cy="220" r="3" fill="#7B9E5A"/>
      <circle cx="200" cy="216" r="2" fill="#9BB87A"/>
      <!-- chopsticks with angle -->
      <line x1="280" y1="180" x2="320" y2="240" stroke="#6B4526" stroke-width="4" stroke-linecap="round"/>
      <line x1="290" y1="180" x2="330" y2="240" stroke="#6B4526" stroke-width="4" stroke-linecap="round"/>
      <!-- a hand holding chopsticks -->
      <ellipse cx="285" cy="185" rx="12" ry="8" fill="#C99A5A" opacity="0.7"/>
      <!-- place mat -->
      <rect x="120" y="310" width="160" height="60" rx="4" fill="#D9CBAA" opacity="0.2"/>
      <!-- tea cup -->
      <ellipse cx="340" cy="320" rx="18" ry="6" fill="#3B2417" opacity="0.6"/>
      <path d="M325,320 C328,340 352,340 355,320 Z" fill="#E7DDC6" opacity="0.7"/>
    </g>`,
    cafe: `<g filter="url(#brush)">
      <!-- wall -->
      <rect x="0" y="0" width="400" height="320" fill="#3B2417" opacity="0.06"/>
      <!-- window with light -->
      <rect x="20" y="40" width="100" height="140" rx="6" fill="#FFB800" opacity="0.08"/>
      <rect x="20" y="40" width="100" height="140" rx="6" fill="none" stroke="#E7DDC6" stroke-width="2" opacity="0.2"/>
      <line x1="70" y1="40" x2="70" y2="180" stroke="#E7DDC6" stroke-width="1.5" opacity="0.15"/>
      <line x1="20" y1="110" x2="120" y2="110" stroke="#E7DDC6" stroke-width="1.5" opacity="0.15"/>
      <!-- pendant light -->
      <line x1="200" y1="0" x2="200" y2="40" stroke="#6B4526" stroke-width="2" opacity="0.4"/>
      <ellipse cx="200" cy="50" rx="20" ry="10" fill="#FFB800" opacity="0.15"/>
      <ellipse cx="200" cy="50" rx="12" ry="6" fill="#FFB800" opacity="0.3"/>
      <!-- table -->
      <rect x="0" y="320" width="400" height="180" fill="#6B4526" opacity="0.25"/>
      <line x1="0" y1="350" x2="400" y2="350" stroke="#4A3F36" stroke-width="1" opacity="0.2"/>
      <!-- steam -->
      <g fill="none" stroke="#EFE2C8" stroke-width="3" stroke-linecap="round" opacity="0.5">
        <path d="M180,200 C175,185 185,180 180,165 C175,150 185,145 180,130"/>
        <path d="M200,200 C205,185 195,180 200,165 C205,150 195,145 200,130"/>
        <path d="M220,200 C215,185 225,180 220,165 C215,150 225,145 220,130"/>
      </g>
      <!-- mug with handle and depth -->
      <path d="M160,230 C160,230 162,290 172,300 C180,308 240,308 248,300 C258,290 260,230 260,230 Z" fill="#E7DDC6"/>
      <path d="M165,235 C165,235 167,285 175,295 C182,302 238,302 245,295 C253,285 255,235 255,235 Z" fill="#D9CBAA" opacity="0.3"/>
      <path d="M260,240 C285,235 287,275 260,273 L260,265 C272,267 272,247 260,251 Z" fill="#D9CBAA"/>
      <ellipse cx="210" cy="230" rx="50" ry="13" fill="#C9B892"/>
      <ellipse cx="210" cy="231" rx="42" ry="10" fill="#3B2417"/>
      <!-- crema on coffee -->
      <ellipse cx="210" cy="231" rx="30" ry="7" fill="#6B4526" opacity="0.5"/>
      <!-- saucer -->
      <ellipse cx="210" cy="315" rx="70" ry="12" fill="#CBBB98" opacity="0.5"/>
      <ellipse cx="210" cy="315" rx="60" ry="8" fill="#D9CBAA" opacity="0.3"/>
      <!-- book on table -->
      <rect x="290" y="310" width="60" height="8" rx="2" fill="#A85F38" opacity="0.6"/>
      <rect x="292" y="305" width="56" height="6" rx="2" fill="#E7DDC6" opacity="0.4"/>
      <!-- a second mug in background -->
      <g transform="translate(80, 280)" opacity="0.3">
        <path d="M0,0 C0,0 2,40 8,46 C14,52 36,52 42,46 C48,40 50,0 50,0 Z" fill="#E7DDC6"/>
        <ellipse cx="25" cy="0" rx="22" ry="6" fill="#C9B892"/>
      </g>
    </g>`,
    park: `<g filter="url(#brush)">
      <!-- sky -->
      <rect x="0" y="0" width="400" height="300" fill="#FFB800" opacity="0.05"/>
      <rect x="0" y="0" width="400" height="150" fill="#F4B84A" opacity="0.04"/>
      <!-- sun -->
      <circle cx="340" cy="60" r="25" fill="#FFB800" opacity="0.2"/>
      <circle cx="340" cy="60" r="14" fill="#FFB800" opacity="0.4"/>
      <!-- clouds -->
      <ellipse cx="80" cy="50" rx="35" ry="10" fill="#EFE2C8" opacity="0.2"/>
      <ellipse cx="200" cy="40" rx="45" ry="8" fill="#EFE2C8" opacity="0.15"/>
      <!-- grass with layers -->
      <path d="M0,300 C80,290 160,310 240,300 C320,290 360,305 400,298 L400,500 L0,500 Z" fill="#7B9E5A" opacity="0.5"/>
      <path d="M0,320 C80,310 160,330 240,320 C320,310 360,325 400,318 L400,500 L0,500 Z" fill="#5E7E42" opacity="0.4"/>
      <path d="M0,340 C80,335 160,345 240,338 C320,333 360,343 400,336 L400,500 L0,500 Z" fill="#4A6B32" opacity="0.3"/>
      <!-- grass blades -->
      <path d="M30,340 L28,330 L32,340" stroke="#7B9E5A" stroke-width="1.5" fill="none" opacity="0.4"/>
      <path d="M60,345 L58,335 L62,345" stroke="#7B9E5A" stroke-width="1.5" fill="none" opacity="0.4"/>
      <path d="M180,340 L178,330 L182,340" stroke="#7B9E5A" stroke-width="1.5" fill="none" opacity="0.4"/>
      <path d="M320,345 L318,335 L322,345" stroke="#7B9E5A" stroke-width="1.5" fill="none" opacity="0.4"/>
      <!-- tree trunk with texture -->
      <rect x="80" y="200" width="20" height="120" rx="4" fill="#6B4526"/>
      <line x1="84" y1="210" x2="84" y2="310" stroke="#4A3F36" stroke-width="1" opacity="0.4"/>
      <line x1="92" y1="220" x2="92" y2="300" stroke="#4A3F36" stroke-width="1" opacity="0.3"/>
      <!-- tree canopy with layers -->
      <circle cx="90" cy="170" r="45" fill="#7B9E5A"/>
      <circle cx="60" cy="185" r="30" fill="#7B9E5A"/>
      <circle cx="120" cy="180" r="28" fill="#5E7E42" opacity="0.5"/>
      <circle cx="90" cy="155" r="25" fill="#9BB87A" opacity="0.4"/>
      <!-- bench -->
      <rect x="200" y="280" width="120" height="8" rx="3" fill="#7A6A58"/>
      <rect x="210" y="288" width="6" height="30" fill="#4A3F36"/>
      <rect x="304" y="288" width="6" height="30" fill="#4A3F36"/>
      <rect x="200" y="260" width="120" height="6" rx="2" fill="#7A6A58" opacity="0.7"/>
      <rect x="210" y="255" width="6" height="30" fill="#4A3F36"/>
      <rect x="304" y="255" width="6" height="30" fill="#4A3F36"/>
      <!-- figure on bench -->
      <g transform="translate(260, 265)">
        <circle cx="0" cy="0" r="7" fill="#C99A5A"/>
        <path d="M-5,7 Q-7,20 -4,30 L4,30 Q7,20 5,7 Z" fill="#6BA8B0"/>
      </g>
      <!-- path -->
      <path d="M150,400 Q200,380 250,400 Q300,420 350,400" fill="none" stroke="#D9CBAA" stroke-width="8" opacity="0.2"/>
    </g>`,
    default: `<g filter="url(#brush)">
      <!-- room backdrop -->
      <rect x="0" y="0" width="400" height="340" fill="#3B2417" opacity="0.06"/>
      <!-- warm lamp glow -->
      <circle cx="200" cy="120" r="80" fill="#FFB800" opacity="0.06"/>
      <circle cx="200" cy="120" r="40" fill="#FFB800" opacity="0.08"/>
      <!-- table -->
      <rect x="0" y="340" width="400" height="160" fill="#E7DDC6" opacity="0.2"/>
      <line x1="0" y1="370" x2="400" y2="370" stroke="#C9B892" stroke-width="1" opacity="0.2"/>
      <!-- steam -->
      <g fill="none" stroke="#EFE2C8" stroke-width="3" stroke-linecap="round" opacity="0.4">
        <path d="M190,230 C185,215 195,210 190,195 C185,180 195,175 190,160"/>
        <path d="M210,230 C215,215 205,210 210,195 C215,180 205,175 210,160"/>
        <path d="M230,230 C225,215 235,210 230,195 C225,180 235,175 230,160"/>
      </g>
      <!-- mug -->
      <path d="M160,260 C160,260 162,320 172,330 C180,338 240,338 248,330 C258,320 260,260 260,260 Z" fill="#E7DDC6"/>
      <path d="M165,265 C165,265 167,315 175,325 C182,332 238,332 245,325 C253,315 255,265 255,265 Z" fill="#D9CBAA" opacity="0.3"/>
      <path d="M260,270 C280,265 282,295 260,293 L260,287 C270,289 270,273 260,277 Z" fill="#D9CBAA"/>
      <ellipse cx="210" cy="260" rx="50" ry="13" fill="#C9B892"/>
      <ellipse cx="210" cy="261" rx="42" ry="10" fill="#3B2417"/>
      <ellipse cx="210" cy="261" rx="30" ry="7" fill="#6B4526" opacity="0.5"/>
      <!-- saucer -->
      <ellipse cx="210" cy="345" rx="70" ry="12" fill="#CBBB98" opacity="0.4"/>
      <!-- notebook on table -->
      <rect x="290" y="340" width="70" height="6" rx="2" fill="#A85F38" opacity="0.5"/>
      <rect x="292" y="335" width="66" height="6" rx="2" fill="#E7DDC6" opacity="0.3"/>
      <line x1="300" y1="338" x2="350" y2="338" stroke="#6B4526" stroke-width="0.5" opacity="0.3"/>
      <!-- pen -->
      <line x1="310" y1="330" x2="340" y2="335" stroke="#4A3F36" stroke-width="2" stroke-linecap="round"/>
    </g>`,
  };

  const sceneSvg = scenePaths[scene] || scenePaths.default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <filter id="brush" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="${4 + seed}" result="w"/>
        <feDisplacementMap in="SourceGraphic" in2="w" scale="5.5" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.5 0"/>
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="#1a120c"/>
    <rect width="${width}" height="${height}" fill="#D9CBAA" opacity="0.06"/>
    ${sceneSvg}
    <rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.25"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
