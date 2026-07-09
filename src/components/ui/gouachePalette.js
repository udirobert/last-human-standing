/**
 * The gouache-on-paper palette — the shared warmth every human motif is painted
 * from (see docs/ART_DIRECTION.md). Constants only, so it can be imported freely
 * without tripping React Fast Refresh (mirrors the RuleIconMap.js / RuleIcons.jsx
 * split). The material is the glue: motifs vary, these colors and the hand do not.
 */
export const GOUACHE = {
  // ceramic / paper
  cream: "#E7DDC6",
  creamShade: "#CBBB98",
  rim: "#C9B892",
  handle: "#D9CBAA",
  steam: "#F3ECDD",
  // coffee
  espresso: "#3B2417",
  crema: "#6B4526",
  espressoHi: "#5A3A22",
  // terracotta pot
  terracotta: "#C67A4B",
  terracottaShade: "#A85F38",
  potRim: "#D98E5E",
  soil: "#3E2A1C",
  // growing things
  leaf: "#7B9E5A",
  leafShade: "#5E7E42",
  stem: "#6E8F4C",
  bud: "#C99A5A",
  // bloom (amber family, ties to the game's --amber)
  petal: "#F4B84A",
  petalShade: "#D9922E",
  petalCore: "#7A3F17",
  // pet — a ginger cat (warm, ties to the terracotta/amber family)
  catBody: "#E39A5A",
  catShade: "#C67A4B",
  catEar: "#E7B9A0",
  catMark: "#B96A4A",
  // extra theme-motif tones
  paper: "#D9CBAA",   // kraft paper / lighter cream
  foam: "#EFE2C8",    // whitest cream — steam, sea foam, paper boat
  sun: "#FFB800",     // the game's amber, for warm light
  iron: "#4A3F36",    // warm charcoal — gym iron, wheels, windows
  ironLight: "#7A6A58",
  water: "#6BA8B0",   // muted gouache teal
};
