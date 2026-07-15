import DozingCat from "./ui/DozingCat.jsx";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import CoffeeBrew from "./ui/CoffeeBrew.jsx";
import StreakBloom from "./ui/StreakBloom.jsx";

/**
 * Shared empty / dwell state — warm human motif + short copy.
 * Use at peak/dwell moments (ART_DIRECTION), not on every blank cell.
 */
export default function EmptyState({
  title,
  body,
  motif = "cat",
  action = null,
  className = "",
}) {
  return (
    <div className={`text-center py-10 px-4 ${className}`}>
      <div className="flex justify-center mb-4">
        {motif === "coffee" ? (
          <CoffeeBrew size={72} />
        ) : motif === "bloom" ? (
          <StreakBloom size={72} streak={0} />
        ) : (
          <DozingCat size={64} />
        )}
      </div>
      {title && (
        <p className="text-bone font-body text-sm mb-1">{title}</p>
      )}
      {body ? (
        <p className="text-bone/55 font-body text-xs mb-5 max-w-xs mx-auto leading-relaxed">
          {body}
        </p>
      ) : (
        <div className="mb-5" />
      )}
      {action}
      <MotifFrieze className="w-full mt-6 opacity-85" />
    </div>
  );
}
