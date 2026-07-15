/**
 * Skeleton fallback for <Suspense> boundaries — warm room + motif so
 * tab switches don't drop into cold pulse bars alone.
 */
import DozingCat from "./DozingCat.jsx";
import CoffeeBrew from "./CoffeeBrew.jsx";

export default function ScreenLoader({ kind = "list", className = "" }) {
  if (kind === "chat") return <ChatLoader className={className} />;
  if (kind === "detail") return <DetailLoader className={className} />;
  return <ListLoader className={className} />;
}

function Pulse({ className = "" }) {
  return <div className={`animate-pulse bg-ember/30 rounded ${className}`} />;
}

function WarmFrame({ children, motif = "cat", className = "" }) {
  return (
    <div className={`relative px-5 py-8 ${className}`}>
      <div className="flex justify-center mb-6 opacity-90">
        {motif === "coffee" ? <CoffeeBrew size={56} /> : <DozingCat size={52} />}
      </div>
      {children}
      <p className="mt-6 text-center font-mono text-dim text-[10px] tracking-widest uppercase">
        Holding the line…
      </p>
    </div>
  );
}

function ListLoader({ className = "" }) {
  return (
    <WarmFrame motif="coffee" className={className}>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl p-3 bg-smoke/80 border border-ember/40">
            <Pulse className="w-7 h-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Pulse className="h-3.5 w-2/3 rounded" />
              <Pulse className="h-2.5 w-1/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </WarmFrame>
  );
}

function ChatLoader({ className = "" }) {
  const widths = ["w-2/3", "w-1/2", "w-3/5"];
  const aligns = ["self-start", "self-end", "self-start"];
  return (
    <WarmFrame motif="cat" className={className}>
      <div className="flex flex-col gap-2">
        {widths.map((w, i) => (
          <div key={i} className={`flex flex-col ${aligns[i]} max-w-[80%]`}>
            <Pulse className="h-3 w-16 rounded mb-1" />
            <Pulse className={`h-8 ${w} rounded-2xl`} />
          </div>
        ))}
      </div>
    </WarmFrame>
  );
}

function DetailLoader({ className = "" }) {
  return (
    <WarmFrame motif="coffee" className={className}>
      <Pulse className="h-36 w-full rounded-2xl mb-4" />
      <div className="space-y-2">
        <Pulse className="h-4 w-3/4 rounded" />
        <Pulse className="h-4 w-1/2 rounded" />
      </div>
      <div className="space-y-2 pt-4">
        <Pulse className="h-3 w-full rounded" />
        <Pulse className="h-3 w-5/6 rounded" />
        <Pulse className="h-3 w-2/3 rounded" />
      </div>
    </WarmFrame>
  );
}
