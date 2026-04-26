import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAT_MESSAGES } from '../data/game';
import { useWorld } from '../world/WorldProvider.jsx';

const BOT_RESPONSES = [
  "day 47 and still alive, respect",
  "who else is already planning what they're buying with the prize money 💀",
  "if you didn't check in yet... bro...",
  "that starbucks submission should be flagged immediately. we have standards.",
  "anyone else checking the player count every 5 minutes or just me",
  "the prize pool hitting 2.5 ETH soon, not sleeping",
  "real ones check in from a local spot. show some culture.",
];

export default function Chat({ onBack }) {
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [toUser, setToUser] = useState('andy');
  const [onlineCount] = useState(247);
  const bottomRef = useRef();
  const inputRef = useRef();
  const { sendWorldChat, user } = useWorld();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Occasionally add a bot message
  useEffect(() => {
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
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();

    // Optimistically add the local message.
    setMessages((m) => [
      ...m,
      {
        id: Date.now(),
        user: user?.displayName ?? 'you',
        msg: text,
        time: 'now',
        isSelf: true,
      },
    ]);
    setInput('');

    try {
      await sendWorldChat({ to: toUser, message: text });
    } catch (e) {
      // If chat fails, add a visible system note.
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          user: 'system',
          msg: `Could not send via World Chat: ${e instanceof Error ? e.message : 'unknown error'}`,
          time: 'now',
          isNew: true,
        },
      ]);
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
              <h2 className="font-display text-3xl text-bone tracking-wide">WORLD CHAT</h2>
              <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-dim text-xs">{onlineCount} survivors online</span>
              <span className="text-dim text-xs">·</span>
              <span className="font-mono text-dim text-xs">powered by XMTP</span>
            </div>
          </div>
          <div className="bg-neon/10 border border-neon/30 rounded-xl px-3 py-1">
            <span className="font-mono text-neon text-xs">🔒 E2E</span>
          </div>
        </div>
      </div>

      {/* XMTP badge */}
      <div className="mx-5 mt-3 bg-smoke border border-ember rounded-xl px-4 py-2 flex items-center gap-2">
        <span className="text-lg">💬</span>
        <p className="text-dim text-xs font-mono">Sends via World Chat (XMTP) · Pick a recipient username</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {/* Day divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-ember" />
          <span className="font-mono text-dim text-xs">DAY 47 · TODAY</span>
          <div className="flex-1 h-px bg-ember" />
        </div>

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
                msg.isSelf ? 'bg-blood text-white' : 'bg-ember text-dim'
              }`}>
                {msg.user.slice(2, 4).toUpperCase()}
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
                  msg.isSelf
                    ? 'bg-blood text-white rounded-tr-sm'
                    : 'bg-smoke border border-ember text-bone rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.msg}</p>
                </div>
                {msg.isNew && !msg.isSelf && (
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
            <div className="bg-smoke border border-ember rounded-2xl px-4 py-3 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="say something to the survivors..."
                className="flex-1 bg-transparent text-bone text-sm font-body focus:outline-none placeholder:text-dim"
              />
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || !toUser.trim()}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg transition-all active:scale-90 ${
              input.trim() && toUser.trim() ? 'bg-blood text-white' : 'bg-ember text-dim'
            }`}
          >
            ↑
          </button>
        </div>
        <p className="text-dim font-mono text-xs mt-2 text-center">Uses MiniKit.chat() to send through World Chat</p>
      </div>
    </div>
  );
}

function stringToColor(str) {
  const colors = ['#FF6B6B', '#FFB800', '#00FF94', '#00C8FF', '#AA55FF', '#FF6B00'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
