import { HUMANITY_PROVIDERS } from "../config/humanityProviders.js";

/**
 * Self Protocol (Celo) — placeholder until @selfxyz/qrcode is wired.
 * World ID remains the primary live path; enable with VITE_ENABLE_SELF=true.
 */
export default function SelfVerify() {
  const self = HUMANITY_PROVIDERS.self;

  if (import.meta.env.VITE_ENABLE_SELF !== "true") {
    return (
      <p className="text-dim text-xs font-mono text-center leading-relaxed">
        <span className="text-amber">Self on Celo</span> — planned.{" "}
        <a href={self.docsUrl} className="text-neon underline" target="_blank" rel="noreferrer">
          Learn more
        </a>
      </p>
    );
  }

  return (
    <div className="bg-smoke border border-ember/30 rounded-xl p-3 text-center">
      <p className="text-bone text-sm font-mono mb-2">Verify with Self Protocol</p>
      <p className="text-dim text-xs font-mono mb-3">
        Scan with the Self app (Celo). Backend: set <code className="text-amber">SELF_ENABLED=true</code> and install{" "}
        <code className="text-amber">@selfxyz/core</code>.
      </p>
      <a
        href={self.docsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block py-2 px-4 rounded-lg bg-neon/10 border border-neon/30 text-neon font-mono text-xs"
      >
        Self integration docs →
      </a>
    </div>
  );
}
