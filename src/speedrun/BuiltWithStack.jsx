/**
 * Partner stack credit — helps World / Self / Celo judges see the rails
 * without forcing wallet flows inside the myth demo.
 */
export default function BuiltWithStack({ className = "" }) {
  return (
    <p
      className={`font-mono text-[10px] tracking-[0.14em] uppercase text-dim/90 ${className}`}
    >
      Built with{" "}
      <span className="text-bone/90">World</span>
      <span className="text-dim/50"> · </span>
      <span className="text-bone/90">Self</span>
      <span className="text-dim/50"> · </span>
      <span className="text-bone/90">Celo</span>
    </p>
  );
}
