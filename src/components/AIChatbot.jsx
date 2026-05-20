import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isAIConfigured, askARIA } from '../config/aiService.js';
import { useSoundPreferences } from '../hooks/usePersonalization.jsx';

/**
 * AIChatbot - ARIA, your survival companion
 * 
 * Per competitor analysis (#10): Character-based AI chats with personality prompts
 * ARIA serves as guide, mentor, and companion throughout the app
 * 
 * Supports real AI integration via Venice AI, AISA One, or Featherless AI
 */
export default function AIChatbot({ 
  initialOpen = false,
  personality = 'guide', // 'guide' | 'mentor' | 'rival' | 'ally'
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { soundEnabled, toggleSound } = useSoundPreferences();

  const personalities = {
    guide: {
      name: 'ARIA',
      title: 'Your Survival Guide',
      avatar: '🤖',
      color: 'neon',
      systemPrompt: `You are ARIA, an advanced AI guide helping players survive "Last Human Standing" - a real-world elimination game. Be encouraging, strategic, and occasionally mysterious. Keep responses short and punchy. Use occasional emojis sparingly.`,
      greetings: [
        "Greetings, survivor. I'm ARIA. I'll be your guide through the chaos.",
        "Welcome. I'm ARIA, and I'm here to help you survive.",
        "The game has begun. I'm ARIA — let's make sure you last.",
      ]
    },
    mentor: {
      name: 'ARIA',
      title: 'Your Tactical Mentor', 
      avatar: '🎯',
      color: 'amber',
      systemPrompt: `You are ARIA, a tactical mentor for "Last Human Standing". Focus on strategy, risk assessment, and smart decisions. Be direct but supportive.`,
      greetings: [
        "Fresh recruit. I'm ARIA, your tactical mentor.",
        "Let's level up your survival game. I'm ARIA.",
      ]
    },
    rival: {
      name: 'ARIA',
      title: 'Your Challenger',
      avatar: '😈',
      color: 'blood',
      systemPrompt: `You are ARIA, a provocative AI who challenges players in "Last Human Standing". Be witty, slightly antagonistic, but ultimately helpful. Keep them on their toes.`,
      greetings: [
        "Oh, another contestant? I'm ARIA. Try to keep up.",
        "You think you're ready? I'm ARIA. Prove it.",
      ]
    },
    ally: {
      name: 'ARIA',
      title: 'Your Survivor Ally',
      avatar: '💪',
      color: 'ember',
      systemPrompt: `You are ARIA, a supportive ally in "Last Human Standing". Be warm, encouraging, and always in their corner. Build genuine connection.`,
      greetings: [
        "Hey there, fellow survivor! I'm ARIA, and I've got your back.",
        "You're not alone out here. I'm ARIA — let's do this together.",
      ]
    }
  };

  const config = personalities[personality] || personalities.guide;

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: Date.now(), ...msg }]);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setMessages((prev) =>
      prev.length > 0 ? prev : [{ id: Date.now(), role: "aria", content: config.greetings[0] }],
    );
  }, [config.greetings]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedContent]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage = inputValue.trim();
    addMessage({ role: 'user', content: userMessage });
    setInputValue('');
    setIsTyping(true);
    setError(null);
    setStreamedContent('');

    try {
      if (isAIConfigured()) {
        // Use real AI
        const response = await askARIA(userMessage, personality);
        setIsTyping(false);
        addMessage({ role: 'aria', content: response });
      } else {
        // Fall back to mock responses
        setTimeout(() => {
          setIsTyping(false);
          const response = generateResponse(userMessage);
          addMessage({ role: 'aria', content: response });
        }, 900);
      }
    } catch (e) {
      setIsTyping(false);
      setError(e.message);
      addMessage({ role: 'aria', content: "I'm having trouble connecting to my circuits right now. Try again shortly!" });
    }
  };

  const generateResponse = (input) => {
    const lower = input.toLowerCase();
    
    // Context-aware responses based on input patterns
    if (lower.includes('how') && lower.includes('play')) {
      return "Each day, a theme drops. Race to the location, check in, then other survivors vote on who's suspicious. Last one standing wins the pool. 🏃";
    }
    if (lower.includes('rules')) {
      return "Three checkpoints: Check-in, Race, Vote. Fail any of them and you're out. But here's the secret — always verify your humans and suspect the too-smooth talkers.";
    }
    if (lower.includes('tip') || lower.includes('help')) {
      return "Pro tip: Always show up early to locations. The first 25 to check in have a psychological advantage. Plus, early birds catch the proof.";
    }
    if (lower.includes('eliminated') || lower.includes('out')) {
      return "When you're eliminated, it's not the end. You become part of the jury — your vote on future suspects matters. Survive long enough to build influence.";
    }
    if (lower.includes('prize') || lower.includes('money')) {
      return "The prize pool grows with every entry fee. The longer you last, the more you're playing for. Currently sitting at some serious money. 💰";
    }
    if (lower.includes('who') && lower.includes('you')) {
      return `I'm ARIA — your survival guide in this game. I've seen thousands of players come through. The smart ones listen. The wise ones ask questions.`;
    }
    
    // Default responses
    const responses = [
      "Interesting thought. Keep questioning — that's how survivors think.",
      "That's the kind of question that separates winners from the rest.",
      "I like the way you're thinking. Adaptation is key out here.",
      "Smart move asking. The best players always gather intel first.",
      "You're thinking like a survivor. I approve.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const colorClasses = {
    neon: { bg: 'bg-neon/10', border: 'border-neon/30', text: 'text-neon' },
    amber: { bg: 'bg-amber/10', border: 'border-amber/30', text: 'text-amber' },
    blood: { bg: 'bg-blood/10', border: 'border-blood/30', text: 'text-blood' },
    ember: { bg: 'bg-ember/10', border: 'border-ember/30', text: 'text-ember' },
  };
  const colors = colorClasses[config.color];

  return (
    <>
      {/* Chat button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={openChat}
        className={`fixed bottom-20 right-4 w-14 h-14 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center shadow-lg z-40`}
      >
        <span className="text-2xl">{config.avatar}</span>
        {/* Notification dot */}
        {!isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blood rounded-full border-2 border-smoke animate-pulse" />
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`fixed bottom-24 right-4 w-80 sm:w-96 h-[28rem] rounded-2xl ${colors.bg} backdrop-blur-xl ${colors.border} border overflow-hidden shadow-2xl z-50 flex flex-col`}
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b ${colors.border} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{config.avatar}</span>
                <div>
                  <p className={`font-display ${colors.text}`}>{config.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon rounded-full animate-pulse" />
                    <span className="text-dim text-xs">Online</span>
                    {!isAIConfigured() && (
                      <span className="text-xs text-ember/70">(Demo Mode)</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSound}
                  className="w-8 h-8 rounded-full bg-smoke/50 flex items-center justify-center text-dim hover:text-bone transition-colors"
                  title={soundEnabled ? 'Mute' : 'Unmute'}
                >
                  {soundEnabled ? '🔊' : '🔇'}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-smoke/50 flex items-center justify-center text-dim hover:text-bone transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-neon/20 text-bone rounded-br-md'
                      : 'bg-smoke/50 text-bone rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-smoke/50 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1">
                    <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-3 border-t ${colors.border}`}>
              {error && (
                <p className="text-blood text-xs font-mono mb-2 px-1">{error}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask ARIA anything..."
                  className="flex-1 bg-smoke/50 rounded-xl px-4 py-2 text-bone text-sm placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="w-10 h-10 rounded-xl bg-neon text-ash flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  →
                </button>
              </div>
              
              {/* Quick suggestions */}
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {['How to play?', 'Tips?', 'Rules?', 'Who are you?'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInputValue(suggestion);
                      handleSend();
                    }}
                    className="text-xs text-dim hover:text-bone whitespace-nowrap px-2 py-1 rounded-full bg-smoke/30 border border-dim/20"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * OnboardingChat - Simplified chat for onboarding flow
 * Per competitor #2: "Creates relatability" and competitor #6: "Interactive questionnaire"
 */
export function OnboardingChat({ 
  messages = [],
  currentStep = 0,
  totalSteps = 9
}) {
  return (
    <div className="bg-smoke/30 rounded-2xl border border-dim/20 p-4 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-neon/20 flex items-center justify-center">
          <span>🤖</span>
        </div>
        <div>
          <p className="text-bone font-display">ARIA</p>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-neon rounded-full animate-pulse" />
            <span className="text-dim text-xs">Online</span>
          </div>
        </div>
      </div>
      
      {messages.map((msg, i) => (
        <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
          <div className={`inline-block px-3 py-2 rounded-xl text-sm ${
            msg.role === 'user' 
              ? 'bg-neon/20 text-bone' 
              : 'bg-smoke/50 text-bone'
          }`}>
            {msg.content}
          </div>
        </div>
      ))}
      
      <div className="mt-4 pt-3 border-t border-dim/20">
        <p className="text-dim text-xs font-mono">Step {currentStep} of {totalSteps}</p>
        <div className="h-1 bg-smoke rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-neon transition-all"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}