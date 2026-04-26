import { useState } from "react";
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { useWorld } from "./WorldProvider.jsx";

export default function WorldIdVerify() {
  const { setWorldIdVerified } = useWorld();

  const appId = import.meta.env.VITE_WORLD_ID_APP_ID;
  const enabled = import.meta.env.VITE_ENABLE_IDKIT === "true";
  const action = import.meta.env.VITE_WORLD_ID_ACTION || "last-human-standing";

  const [err, setErr] = useState(null);

  if (!enabled) return null;

  if (!appId) {
    return (
      <p className="text-blood text-xs font-mono text-center">
        Missing VITE_WORLD_ID_APP_ID (World ID disabled)
      </p>
    );
  }

  return (
    <div className="w-full space-y-2">
      {err && <p className="text-blood text-xs font-mono text-center">{err}</p>}

      <IDKitWidget
        app_id={appId}
        action={action}
        verification_level={VerificationLevel.Orb}
        handleVerify={async (result) => {
          setErr(null);
          const resp = await fetch("/api/idkit/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ idkitResponse: result }),
          });
          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(text || "World ID verification failed");
          }
        }}
        onSuccess={() => {
          setWorldIdVerified(true);
        }}
        onError={(code) => {
          setErr(String(code));
        }}
      >
        {({ open }) => (
          <button
            onClick={open}
            className="w-full font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-all bg-neon/10 border border-neon/40 text-neon"
          >
            VERIFY WORLD ID
          </button>
        )}
      </IDKitWidget>
    </div>
  );
}
