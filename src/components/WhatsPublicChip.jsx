import FAQModal from "./FAQModal.jsx";
import { FAQ_PUBLIC_PHOTO_INDEX } from "../lib/copy.js";

/**
 * Quiet trust chip — opens FAQ on “Who sees my check-in photo?”
 * Use next to TrustBadge on landing / reserve footers.
 */
export default function WhatsPublicChip({ className = "" }) {
  return (
    <FAQModal
      expandOnOpen={FAQ_PUBLIC_PHOTO_INDEX}
      trigger={
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-smoke/70 px-2.5 py-1 font-mono text-[10px] tracking-wide text-dim hover:border-amber/50 hover:text-bone transition-colors ${className}`}
        >
          What’s public →
        </span>
      }
    />
  );
}
