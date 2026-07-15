import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import ScreenLoader from './ui/ScreenLoader.jsx';
import NetworkPill from './ui/NetworkPill.jsx';
import FAQModal from './FAQModal.jsx';
import AppShell from './AppShell.jsx';
import EmptyState from './EmptyState.jsx';
import { CHAT_COPY } from '../lib/copy.js';
import { CUE_PRESS } from '../lib/cuelume.js';

// Dev convenience: in development, fall back to simulated chat when not
// in the mini app. In production, real lobby messages are the only thing
// served to anyone — browser visitors are real players.
const useMocks = import.meta.env.DEV;

export default function Chat({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [toUser, setToUser] = useState('');
  const [chatMode, setChatMode] = useState('lobby'); // lobby | dm
  const bottomRef = useRef();
  const inputRef = useRef();
  const { sendWorldChat, user, isMiniApp, walletAuthed } = useWorld();
  const { phase } = useRound();
  const [rosterCount, setRosterCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatLoading, setChatLoading] = useState(true);
  const onlineCount = isMiniApp || useMocks ? rosterCount : null;
  const walletAddress = user?.address;

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
        const randMsg = CHAT_COPY.demoResponses[Math.floor(Math.random() * CHAT_COPY.demoResponses.length)];
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

  // ---- Fetch real lobby messages (mini app + browser) ----
  const loadMessages = useCallback(async () => {
    if (useMocks && !isMiniApp) {
      // Dev-only: the simulated-chat effects above own the message list.
      setChatLoading(false);
      return;
    }
    try {
      const resp = await fetch('/api/chat/messages?limit=50');
      if (!resp.ok) throw new Error(`chat_${resp.status}`);
      setChatError(null);
      const data = await resp.json();
      if (Array.isArray(data?.messages)) {
        setMessages(data.messages.map(m => ({
          id: m.id,
          user: m.username ? `@${m.username}` : (m.address?.slice(0, 10) + '…'),
          msg: m.message,
          time: timeAgo(m.created_at),
          isSelf: walletAddress && m.address?.toLowerCase() === walletAddress.toLowerCase(),
        })));
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'chat_load_failed');
    } finally {
      setChatLoading(false);
    }
  }, [isMiniApp, walletAddress]);

  useEffect(() => {
    loadMessages();
    if (useMocks && !isMiniApp) return;
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
      } catch {
        setMessages(m => [...m, {
          id: Date.now() + 1,
          user: 'system',
          msg: CHAT_COPY.sendFailed,
          time: 'now',
        }]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }

      // Also send via World Chat DM if the user is in DM mode with a
      // recipient — Lobby-only messages don't go through World Chat.
      if (chatMode === 'dm' && toUser.trim()) {
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
      } catch {
        setMessages(m => [...m, {
          id: Date.now() + 1,
          user: 'system',
          msg: CHAT_COPY.worldChatFailed,
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

  const canSend = chatMode === 'lobby'
    ? input.trim().length > 0 && (isMiniApp || useMocks ? walletAuthed : true)
    : input.trim().length > 0 && toUser.trim().length > 0;

  return (
    <AppShell phase={phase === "live" ? "live" : phase === "ended" ? "ended" : "prelaunch"}>
      {/* Header */}
      <div className="relative z-10 px-5 pt-10 pb-4 bg-ash/70 backdrop-blur-md border-b border-ember/30">
        <div className="flex items-center gap-4 mb-1">
          <button
            type="button"
            onClick={onBack}
            {...CUE_PRESS}
            className="w-10 h-10 rounded-xl bg-smoke/70 border border-ember/40 flex items-center justify-center hover:border-amber/60 active:scale-[0.97] transition-transform"
            aria-label="Back"
          >
            <span className="text-dim text-lg">←</span>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-3xl text-bone tracking-wide leading-none">Survivors lobby</h2>
              <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {isMiniApp && onlineCount != null ? (
                <span className="font-mono text-dim text-xs tabular-nums">{onlineCount} humans reserved</span>
              ) : useMocks ? (
                <span className="font-mono text-amber text-xs">Dev preview — simulated messages</span>
              ) : (
                <span className="font-mono text-dim text-xs">Talk with the living</span>
              )}
            </div>
          </div>
          <FAQModal />
        </div>
      </div>

      {/* Context banner */}
      <div className="mx-5 mt-3 bg-smoke/80 border border-ember/40 rounded-xl px-4 py-2.5">
        <p className="text-bone/70 text-xs font-body leading-relaxed">
          {isMiniApp
            ? (chatMode === 'lobby'
                ? 'Lobby chat — all survivors can see your messages.'
                : `Direct message via World Chat · to @${toUser || '…'}`)
            : (chatMode === 'lobby'
                ? 'Lobby chat — visible to all survivors.'
                : `Sends via World Chat · to @${toUser || '…'}`)}
        </p>
      </div>

      {/* Messages */}
      <NetworkPill error={chatError} onRetry={loadMessages} />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
        {/* Day divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-ember" />
          <span className="font-mono text-dim text-xs">
            LOBBY · TODAY
          </span>
          <div className="flex-1 h-px bg-ember" />
        </div>

        {/* Loading state for first fetch */}
        {chatLoading && messages.length === 0 && (
          <ScreenLoader kind="chat" />
        )}

        {/* Empty state */}
        {!chatLoading && messages.length === 0 && (
          <EmptyState
            motif="cat"
            title="No messages yet"
            body="Be the first to say something to the survivors."
            className="py-8"
          />
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
                  <p className="text-sm leading-relaxed font-body">{msg.msg}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input — sits above BottomNav with shared safe-area offset */}
      <div
        className="relative z-10 px-5 pt-3 bg-ash/80 backdrop-blur-md border-t border-ember/40"
        style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Mode toggle — Lobby (broadcast to survivors) or DM (private to a single recipient) */}
        <div className="flex gap-2 mb-2.5">
          <button
            type="button"
            onClick={() => setChatMode('lobby')}
            {...CUE_PRESS}
            className={`flex-1 py-2 rounded-xl font-mono text-xs uppercase tracking-wider active:scale-[0.97] transition-transform ${
              chatMode === 'lobby' ? 'bg-blood text-bone' : 'bg-smoke text-dim border border-ember'
            }`}
          >
            Lobby
          </button>
          <button
            type="button"
            onClick={() => setChatMode('dm')}
            {...CUE_PRESS}
            className={`flex-1 py-2 rounded-xl font-mono text-xs uppercase tracking-wider active:scale-[0.97] transition-transform ${
              chatMode === 'dm' ? 'bg-blood text-bone' : 'bg-smoke text-dim border border-ember'
            }`}
          >
            DM
          </button>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            {/* Recipient field — only in DM mode (private 1:1 via World Chat) */}
            {chatMode === 'dm' && (
              <div className="bg-smoke border border-ember rounded-2xl px-4 py-2 flex items-center gap-2">
                <span className="font-mono text-dim text-xs">to @</span>
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
                placeholder={chatMode === 'lobby' ? 'message the lobby...' : `message @${toUser || '…'}...`}
                className="flex-1 bg-transparent text-bone text-sm font-body focus:outline-none placeholder:text-dim"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || sending}
            {...CUE_PRESS}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg transition-transform active:scale-[0.97] ${
              canSend && !sending ? 'bg-blood text-white' : 'bg-ember text-dim'
            }`}
          >
            {sending ? '…' : '↑'}
          </button>
        </div>
        <p className="text-dim font-mono text-xs mt-2 text-center">
          {chatMode === 'lobby'
            ? 'Visible to all survivors'
            : `Private message via World Chat to @${toUser || '…'}`}
        </p>
      </div>
    </AppShell>
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
