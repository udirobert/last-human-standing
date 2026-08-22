# __experimental__ — Quarantine Zone

This directory holds prototype and experimental code that is **not mounted** in
the main application chrome.

## Why does this exist?

Several files were built as proofs-of-concept or early experiments but never
got integrated into the production UI. They remain in the repository because
they might be revived later. To keep them out of the production bundle and
prevent accidental activation, they have been moved here.

## Rules

- **Do not import from here in production paths.** The DelightProvider and
  other production components should use the canonical sources under
  `hooks/`, `components/`, and `context/`.
- If any of these files are accidentally activated, they will inject the **wrong
  styling** into the app:
  - Tailwind colour classes like `cyan-400` that clash with the brand palette
    (`#FF1A1A` / `#FFB800` / `#FFD600`).
  - Emoji icons (📍🔥💀) that contradict the hand-painted motif vocabulary
    used by the Mascot component and other brand assets.
- This is **not** a staging area. When a feature is ready to ship, it should
  be integrated into the production codebase directly, not moved out of this
  directory.

## Files

| File | Status |
|------|--------|
| `useAchievements.jsx` | Prototype achievement grid — uses emoji icons (📍🔥💀), not mounted in chrome |
| `usePersonalization.jsx` | Contains THEMES with 'bloodmoon', 'arctic', 'gold' colour schemes using Tailwind classes (cyan-400, etc.) that clash with brand palette |
| `MascotEventContext.js` | Empty context (`createContext(null)`) — dead code; MascotEventProvider has its own context internally |
