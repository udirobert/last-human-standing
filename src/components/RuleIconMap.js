import { IconReserve, IconTheme, IconProve, IconTrophy } from "./RuleIcons.jsx";

/**
 * Maps the RULES array's `n` field to the matching custom SVG icon.
 * Lives in its own file because react-refresh's only-export-components
 * rule prevents the map from sitting alongside the icon components.
 */
export const RULE_ICON_MAP = {
  "01": IconReserve,
  "02": IconTheme,
  "03": IconProve,
  "04": IconTrophy,
};
