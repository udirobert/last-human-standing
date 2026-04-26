import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Onboarding({ onEnter }) {
  const [step, setStep] = useState(0); // 0=splash, 1=rules, 2=verify
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerified(true);
      setTimeout(() => onEnter(), 1200);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-between px-6 pt-20 pb-12"
          >
            {/* Drip marks */}
            <div className="absolute top-0 left-0 right-0 flex justify-around pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-blood rounded-b-full opacity-60"
                  style={{
                    height: `${20 + Math.random() * 40}px`,
                    animationDelay: `${i * 0.3}s`,
                    marginLeft: `${Math.random() * 20}px`,
                  }}
                />
              ))}
            </div>

            <div className="flex flex-col items-center mt-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-smoke border-2 border-blood flex items-center justify-center animate-pulse-blood">
                  <span className="text-5xl">💀</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blood rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-mono font-bold">47</span>
                </div>
              </div>

              <h1 className="font-display text-6xl text-bone text-center leading-none tracking-wider animate-glow">
                LAST<br />HUMAN<br />STANDING
              </h1>

              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
                <span className="text-neon font-mono text-xs tracking-widest uppercase">1,247 humans alive</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { label: "DAY", val: "47" },
                  { label: "PRIZE", val: "2.4 ETH" },
                  { label: "ELIMINATED", val: "8,941" },
                ].map((s) => (
                  <div key={s.label} className="bg-smoke rounded-xl p-3 text-center border border-ember">
                    <div className="text-dim font-mono text-xs tracking-widest">{s.label}</div>
                    <div className="text-bone font-display text-2xl mt-0.5">{s.val}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full bg-blood text-bone font-display text-3xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform"
              >
                ENTER THE GAME
              </button>
              <p className="text-dim text-xs text-center font-mono">
                World ID required · One human, one account
              </p>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="rules"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="flex-1 flex flex-col px-6 pt-14 pb-12"
          >
            <button onClick={() => setStep(0)} className="text-dim text-sm mb-8 text-left">← back</button>
            <h2 className="font-display text-5xl text-bone mb-2 animate-glow">THE RULES</h2>
            <p className="text-dim text-sm font-mono mb-8">simple. brutal. fair.</p>

            <div className="space-y-4 flex-1">
              {[
                { n: "01", title: "ONE HUMAN, ONE ACCOUNT", body: "World ID proves you're real. No bots. No alt accounts. Just you.", icon: "🫂" },
                { n: "02", title: "CHECK IN DAILY", body: "A new theme drops every day. Miss it, and you're out. No exceptions.", icon: "📸" },
                { n: "03", title: "COMMUNITY VERIFIES", body: "Other humans vote on your submission. Too many fake votes and you're eliminated.", icon: "✅" },
                { n: "04", title: "LAST ONE WINS", body: "The final human standing splits the prize pool. Real money. On-chain.", icon: "🏆" },
              ].map((rule) => (
                <motion.div
                  key={rule.n}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: parseInt(rule.n) * 0.1 }}
                  className="flex gap-4 bg-smoke rounded-2xl p-4 border border-ember"
                >
                  <div className="text-3xl flex-shrink-0 mt-0.5">{rule.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-blood text-xs">{rule.n}</span>
                      <span className="font-display text-bone text-xl tracking-wide">{rule.title}</span>
                    </div>
                    <p className="text-dim text-sm leading-relaxed">{rule.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <div className="bg-ember border border-blood/30 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-bone text-xs leading-relaxed">Entry fee: <span className="text-amber font-mono">0.01 ETH</span> goes directly to the prize pool via World Wallet</p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-blood text-bone font-display text-3xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform"
              >
                I UNDERSTAND
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="verify"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-between px-6 pt-14 pb-12"
          >
            <button onClick={() => setStep(1)} className="self-start text-dim text-sm mb-8">← back</button>

            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="mb-8 text-center">
                <h2 className="font-display text-5xl text-bone mb-2">PROVE YOUR<br />HUMANITY</h2>
                <p className="text-dim text-sm font-mono">World ID · zero-knowledge proof</p>
              </div>

              {!verified ? (
                <div className="w-full space-y-6">
                  <div className="bg-smoke border border-ember rounded-3xl p-8 flex flex-col items-center gap-4">
                    <div className={`w-24 h-24 rounded-full border-2 ${verifying ? 'border-amber animate-spin' : 'border-neon'} flex items-center justify-center relative`}>
                      {verifying ? (
                        <div className="w-16 h-16 rounded-full border-4 border-amber border-t-transparent animate-spin" />
                      ) : (
                        <span className="text-5xl">🌐</span>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-bone font-mono text-sm">
                        {verifying ? "Verifying with World ID..." : "Tap to verify with World ID"}
                      </p>
                      <p className="text-dim text-xs mt-1">Private · Zero-knowledge · Irreversible</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      "✓ Proves you're a unique human",
                      "✓ Zero personal data shared",
                      "✓ One account per person, forever",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-dim text-sm font-mono">
                        <span className="text-neon">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-24 h-24 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center">
                    <span className="text-5xl">✅</span>
                  </div>
                  <div className="text-center">
                    <p className="text-neon font-display text-3xl">HUMAN VERIFIED</p>
                    <p className="text-dim font-mono text-sm mt-1">Entering game...</p>
                  </div>
                </motion.div>
              )}
            </div>

            {!verified && (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className={`w-full font-display text-3xl tracking-widest py-4 rounded-2xl active:scale-95 transition-all ${
                  verifying ? 'bg-ember text-dim' : 'bg-neon text-ash'
                }`}
              >
                {verifying ? "VERIFYING..." : "VERIFY WITH WORLD ID"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
