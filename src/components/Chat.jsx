import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';

const BOT_RESPONSES = [
  "still alive another day, respect",
  "who else is already planning what they're buying with the prize money 💀",
  "if you didn't check in yet... bro...",
  "that starbucks submission should be flagged immediately. we have standards.",
  "anyone else checking the player count every 5 minutes or just me",
  "the prize pool growing with every entry, not sleeping",
  "real ones check in from a local spot. show some culture.",
];

// Dev convenience: in development, fall back to simulated chat when not
// in the mini app. In production, real lobby messages are the only thing
// served to anyone — browser visitors are real players.
const useMocks = import.meta.env.DEV;

export default function Chat({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [toUser, setToUser] = useState('andy');
  const bottomRef = useRef();
  const inputRef = useRef();
  const { sendWorldChat, user, isMiniApp, walletAuthed } = useWorld();
  const [rosterCount, setRosterCount] = useState(0);
  const [sending, setSending] = useState(false);
  const onlineCount = isMiniApp || useMocks ? rosterCount : null;

  // ---- Browser demo: seed fake messages + bot interval ----
  useEffect(() => {
    if (!useMocks || isMiniApp) return;
    import('../data/game').then(({ CHAT_MESSAGES }) => setMessages(CHAT_MESSAGES));
  }, [isMiniApp]);

  useEffect(() => {
    if (!useMocks || isMiniApp) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const users = ['0xGhost_4459', '0xHuman_7734', '0xLastOnes_8823', '0xSurvivor_2291', '0xNewbie_9001', '0xElite_0042'];
        const randUser = users[Math.floor(Math.random() * users.length)];
        const randMsg = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
        setMessages(m => [...m, {
          id: Date.now(),
          user: randUser,
          msg: randMsg,
          time: 'now',
          isNew: true,
        }]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isMiniApp]);

  // ---- Mini app: fetch real lobby messages ----
  const loadMessages = useCallback(async () => {
    if (!isMiniApp) return;
    try {
      const resp = await fetch('/api/chat/messages?limit=50');
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data?.messages)) {
        setMessages(data.messages.map(m => ({
          id: m.id,
          user: m.username ? `@${m.username}` : (m.address?.slice(0, 10) + '…'),
          msg: m.message,
          time: timeAgo(m.created_at),
          isSelf: user?.address && m.address?.toLowerCase() === user.address.toLowerCase(),
          isVerified: true,
        })));
      }
    } catch { /* ignore */ }
  }, [isMiniApp, user?.address]);

  useEffect(() => {
    loadMessages();
    if (!isMiniApp) return;
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, [loadMessages, isMiniApp]);

  // Fetch real roster count for mini app
  useEffect(() => {
    if (!isMiniApp) return;
    const load = () => fetch('/api/cohort/roster').then(r => r.json()).then(d => {
      if (d?.roster) setRosterCount(d.roster.length);
    }).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [isMiniApp]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();

    const shouldUseRealLobby = isMiniApp || !useMocks;

    if (shouldUseRealLobby && walletAuthed) {
      // Real lobby message — post to server
      setSending(true);
      setMessages(m => [...m, {
        id: Date.now(),
        user: user?.displayName ?? 'you',
        msg: text,
        time: 'now',
        isSelf: true,
      }]);
      setInput('');

      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message: text }),
        });
        await loadMessages();
      } catch (e) {
        setMessages(m => [...m, {
          id: Date.now() + 1,
          user: 'system',
          msg: `Failed to send: ${e instanceof Error ? e.message : 'unknown'}`,
          time: 'now',
        }]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }

      // Also send via World Chat DM if a recipient is specified
      if (toUser.trim()) {
        try { await sendWorldChat({ to: toUser, message: text }); } catch { /* optional */ }
      }
    } else {
      // Browser demo: local-only message + World Chat attempt
      setMessages(m => [...m, {
        id: Date.now(),
        user: user?.displayName ?? 'you',
        msg: text,
        time: 'now',
        isSelf: true,
      }]);
      setInput('');

      try {
        await sendWorldChat({ to: toUser, message: text });
      } catch (e) {
        setMessages(m => [...m, {
          id: Date.now() + 1,
          user: 'system',
          msg: `Could not send via World Chat: ${e instanceof Error ? e.message : 'unknown error'}`,
          time: 'now',
          isNew: true,
        }]);
      } finally {
        inputRef.current?.focus();
      }
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = isMiniApp || useMocks
    ? input.trim().length > 0 && walletAuthed
    : input.trim().length > 0 && toUser.trim().length > 0;

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-ash border-b border-ember">
        <div className="flex items-center gap-4 mb-1">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
            <span className="text-dim text-lg">←</span>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-3xl text-bone tracking-wide">SURVIVORS LOBBY</h2>
              <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isMiniApp && onlineCount != null ? (
                <span className="font-mono text-dim text-xs">{onlineCount} humans reserved</span>
              ) : (
                <span className="font-mono text-amber text-xs">Demo chat — simulated messages</span>
              )}
              {isMiniApp && (
                <>
                  <span className="text-dim text-xs">·</span>
                  <span className="font-mono text-dim text-xs">powered by XMTP</span>
                </>
              )}
            </div>
          </div>
          <div className="bg-neon/10 border border-neon/30 rounded-xl px-3 py-1">
            <span className="font-mono text-neon text-xs">🔒 E2E</span>
          </div>
        </div>
      </div>

      {/* Context banner */}
      <div className="mx-5 mt-3 bg-smoke border border-ember rounded-xl px-4 py-2 flex items-center gap-2">
        <span className="text-lg">💬</span>
        <p className="text-dim text-xs font-mono">
          {isMiniApp
            ? 'Lobby chat — all survivors can see your messages. Tap send to broadcast.'
            : 'Sends via World Chat (XMTP) · Pick a recipient username'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {/* Day divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-ember" />
          <span className="font-mono text-dim text-xs">
            {isMiniApp ? 'LOBBY · TODAY' : `DAY ${Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 10 + 1} · TODAY`}
          </span>
          <div className="flex-1 h-px bg-ember" />
        </div>

        {/* Empty state for mini app */}
        {isMiniApp && messages.length === 0 && (
          <div className="text-center py-8">
            <span className="text-4xl block mb-3">🫂</span>
            <p className="text-bone font-mono text-sm mb-1">No messages yet</p>
            <p className="text-dim font-mono text-xs">Be the first to say something to the survivors.</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.isSelf ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-mono ${
                msg.user === 'system' ? 'bg-blood/30 text-blood'
                : msg.isSelf ? 'bg-blood text-white' : 'bg-ember text-dim'
              }`}>
                {msg.user === 'system' ? '⚠' : (msg.user.startsWith('@') ? msg.user.slice(1, 3).toUpperCase() : msg.user.slice(2, 4).toUpperCase())}
              </div>

              <div className={`flex flex-col gap-0.5 max-w-xs ${msg.isSelf ? 'items-end' : ''}`}>
                <div className="flex items-center gap-2">
                  {!msg.isSelf && (
                    <span className="font-mono text-xs" style={{ color: stringToColor(msg.user) }}>
                      {msg.user}
                    </span>
                  )}
                  <span className="font-mono text-dim text-xs">{msg.time}</span>
                </div>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  msg.user === 'system'
                    ? 'bg-blood/10 border border-blood/30 text-blood rounded-tl-sm'
                    : msg.isSelf
                      ? 'bg-blood text-white rounded-tr-sm'
                      : 'bg-smoke border border-ember text-bone rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.msg}</p>
                </div>
                {(msg.isVerified || msg.isNew) && !msg.isSelf && msg.user !== 'system' && (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-neon animate-pulse" />
                    <span className="font-mono text-neon text-xs">World ID verified</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 bg-ash border-t border-ember">
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            {/* Recipient field — only for browser dev preview (1:1 DM via World Chat) */}
            {!isMiniApp && useMocks && (
              <div className="bg-smoke border border-ember rounded-2xl px-4 py-2 flex items-center gap-2">
                <span className="font-mono text-dim text-xs">@</span>
                <input
                  type="text"
                  value={toUser}
                  onChange={(e) => setToUser(e.target.value.replace(/^@/, ''))}
                  placeholder="username"
                  className="flex-1 bg-transparent text-bone text-xs font-mono focus:outline-none placeholder:text-dim"
                />
              </div>
            )}
            <div className="bg-smoke border border-ember rounded-2xl px-4 py-3 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isMiniApp || useMocks ? 'message the lobby...' : 'message the lobby...'}
                className="flex-1 bg-transparent text-bone text-sm font-body focus:outline-none placeholder:text-dim"
              />
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg transition-all active:scale-90 ${
              canSend && !sending ? 'bg-blood text-white' : 'bg-ember text-dim'
            }`}
          >
            {sending ? '…' : '↑'}
          </button>
        </div>
        <p className="text-dim font-mono text-xs mt-2 text-center">
          {isMiniApp
            ? 'Messages visible to all survivors · also sends via World Chat'
            : 'Uses MiniKit.chat() to send through World Chat'}
        </p>
      </div>
    </div>
  );
}

function timeAgo(isoStr) {
  if (!isoStr) return 'now';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function stringToColor(str) {
  const colors = ['#FF6B6B', '#FFB800', '#00FF94', '#00C8FF', '#AA55FF', '#FF6B00'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
