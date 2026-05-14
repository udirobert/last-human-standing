import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from './Mascot';

/**
 * Survival Profile Quiz - collects key user data naturally
 * Personalizes the experience and builds emotional investment
 */
const PROFILE_QUESTIONS = [
  {
    id: 'style',
    question: "What's your survival style?",
    emoji: '🎯',
    options: [
      { id: 'adventurer', label: 'Adventurer', description: 'I go everywhere, do everything', icon: '🏔️' },
      { id: 'strategist', label: 'Strategist', description: 'I plan my moves carefully', icon: '🧠' },
      { id: 'social', label: 'Social Survivor', description: 'My network is my power', icon: '🤝' },
    ],
  },
  {
    id: 'vibe',
    question: "Your game vibe?",
    emoji: '⚡',
    options: [
      { id: 'competitive', label: 'Competitor', description: 'First place or nothing', icon: '🏆' },
      { id: 'casual', label: 'Casual', description: 'I play for fun, no pressure', icon: '😌' },
      { id: 'spectator', label: 'Spectator', description: 'I watch and learn first', icon: '👀' },
    ],
  },
  {
    id: 'device',
    question: "Your check-in weapon?",
    emoji: '📱',
    options: [
      { id: 'phone', label: 'Phone Camera', description: 'Always in my pocket', icon: '📸' },
      { id: 'action', label: 'Action Cam', description: 'GoPro lifestyle', icon: '🎬' },
      { id: 'pro', label: 'Pro Camera', description: 'Quality is everything', icon: '📷' },
    ],
  },
  {
    id: 'goal',
    question: "What do you want from the prize?",
    emoji: '💰',
    options: [
      { id: 'money', label: 'The Money', description: 'That WLD is mine', icon: '💎' },
      { id: 'glory', label: 'The Glory', description: 'I want to be the last one standing', icon: '👑' },
      { id: 'experience', label: 'The Experience', description: 'Just here for the vibes', icon: '✨' },
    ],
  },
];

const PROFILE_TYPES = {
  'adventurer-competitive-phone': { name: 'The Speedrunner', emoji: '⚡', color: '#00FF94', tagline: 'You check in before they know you exist.' },
  'adventurer-competitive-action': { name: 'The Action Hero', emoji: '🎬', color: '#00C8FF', tagline: 'Cinematic proof of every moment.' },
  'adventurer-competitive-pro': { name: 'The Professional', emoji: '📸', color: '#FFB800', tagline: 'Every shot is portfolio-ready.' },
  'adventurer-glory-phone': { name: 'The Trailblazer', emoji: '🏔️', color: '#00FF94', tagline: 'First there. Always first.' },
  'adventurer-glory-action': { name: 'The Documentarian', emoji: '🎥', color: '#AA55FF', tagline: 'Your survival is content.' },
  'adventurer-glory-pro': { name: 'The Visionary', emoji: '👁️', color: '#FF6B00', tagline: 'You see what others miss.' },
  'adventurer-experience-phone': { name: 'The Wanderer', emoji: '🌍', color: '#00FF94', tagline: 'Every check-in is a new story.' },
  'adventurer-experience-action': { name: 'The Adventurer', emoji: '🧭', color: '#00C8FF', tagline: 'Life is the destination.' },
  'adventurer-experience-pro': { name: 'The Curator', emoji: '🎨', color: '#FFB800', tagline: 'Your life, masterpiece.' },
  
  'strategist-competitive-phone': { name: 'The Tactician', emoji: '♟️', color: '#FF6B00', tagline: 'You strike when they least expect.' },
  'strategist-competitive-action': { name: 'The Director', emoji: '🎬', color: '#FFB800', tagline: 'Every move is calculated.' },
  'strategist-competitive-pro': { name: 'The Perfectionist', emoji: '🎯', color: '#FF1A1A', tagline: 'Flawless execution.' },
  'strategist-glory-phone': { name: 'The Planner', emoji: '📋', color: '#AA55FF', tagline: 'Your success is no accident.' },
  'strategist-glory-action': { name: 'The Strategist', emoji: '🧠', color: '#00FF94', tagline: 'They never see you coming.' },
  'strategist-glory-pro': { name: 'The Analyst', emoji: '📊', color: '#00C8FF', tagline: 'Data drives dominance.' },
  'strategist-experience-phone': { name: 'The Zen Master', emoji: '🧘', color: '#00FF94', tagline: 'You find peace in chaos.' },
  'strategist-experience-action': { name: 'The Observer', emoji: '🔭', color: '#AA55FF', tagline: 'Knowledge is your edge.' },
  'strategist-experience-pro': { name: 'The Scholar', emoji: '📚', color: '#FFB800', tagline: 'Learn. Adapt. Survive.' },
  
  'social-competitive-phone': { name: 'The Charmer', emoji: '💬', color: '#FFB800', tagline: 'Your network wins for you.' },
  'social-competitive-action': { name: 'The Connector', emoji: '🔗', color: '#00C8FF', tagline: 'Allies are assets.' },
  'social-competitive-pro': { name: 'The Leader', emoji: '👑', color: '#FF1A1A', tagline: 'They follow you anywhere.' },
  'social-glory-phone': { name: 'The Influencer', emoji: '📣', color: '#00FF94', tagline: 'They watch because you move.' },
  'social-glory-action': { name: 'The Rally', emoji: '📢', color: '#AA55FF', tagline: 'You bring them with you.' },
  'social-glory-pro': { name: 'The Commander', emoji: '🎖️', color: '#FF6B00', tagline: 'Your crew, your crown.' },
  'social-experience-phone': { name: 'The Host', emoji: '🎉', color: '#FFB800', tagline: 'The party goes where you go.' },
  'social-experience-action': { name: 'The Gatherer', emoji: '🌟', color: '#00FF94', tagline: 'Good times, shared times.' },
  'social-experience-pro': { name: 'The Collector', emoji: '🏺', color: '#AA55FF', tagline: 'Stories worth keeping.' },
  
  'casual-competitive-phone': { name: 'The Dark Horse', emoji: '🐴', color: '#00FF94', tagline: 'They sleep on you, you win.' },
  'casual-competitive-action': { name: 'The Casual King', emoji: '👑', color: '#FFB800', tagline: 'Laid back, sharp instincts.' },
  'casual-competitive-pro': { name: 'The Underdog', emoji: '🏅', color: '#FF6B00', tagline: 'They don\'t see you coming.' },
  'casual-glory-phone': { name: 'The Quiet One', emoji: '🤫', color: '#00FF94', tagline: 'No noise, just wins.' },
  'casual-glory-action': { name: 'The Steady', emoji: '⚖️', color: '#AA55FF', tagline: 'Consistency is your weapon.' },
  'casual-glory-pro': { name: 'The Phoenix', emoji: '🔥', color: '#FF1A1A', tagline: 'They count you out, you rise.' },
  'casual-experience-phone': { name: 'The Regular', emoji: '☕', color: '#FFB800', tagline: 'Good vibes only.' },
  'casual-experience-action': { name: 'The Enthusiast', emoji: '🌈', color: '#00FF94', tagline: 'Every day is a good day.' },
  'casual-experience-pro': { name: 'The Enjoyer', emoji: '🎭', color: '#00C8FF', tagline: 'Life is for living.' },
  
  'spectator-competitive-phone': { name: 'The Watcher', emoji: '👁️', color: '#AA55FF', tagline: 'You study, you learn, you strike.' },
  'spectator-competitive-action': { name: 'The Analyst', emoji: '📊', color: '#FF6B00', tagline: 'Patience is your power.' },
  'spectator-competitive-pro': { name: 'The Shadow', emoji: '🌑', color: '#00C8FF', tagline: 'You see everything, they see nothing.' },
  'spectator-glory-phone': { name: 'The Student', emoji: '📖', color: '#00FF94', tagline: 'Every day makes you better.' },
  'spectator-glory-action': { name: 'The Critic', emoji: '🎨', color: '#AA55FF', tagline: 'You know the game inside out.' },
  'spectator-glory-pro': { name: 'The Expert', emoji: '🏆', color: '#FF1A1A', tagline: 'Mastery earned, not given.' },
  'spectator-experience-phone': { name: 'The Explorer', emoji: '🔍', color: '#00FF94', tagline: 'Every corner holds something new.' },
  'spectator-experience-action': { name: 'The Seeker', emoji: '🌠', color: '#FFB800', tagline: 'You find beauty in detail.' },
  'spectator-experience-pro': { name: 'The Curator', emoji: '🎭', color: '#AA55FF', tagline: 'You collect the best moments.' },
};

function getDefaultProfile() {
  return { style: null, vibe: null, device: null, goal: null };
}

export default function SurvivalProfile({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(getDefaultProfile());
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  const question = PROFILE_QUESTIONS[step];
  const progress = ((step + 1) / PROFILE_QUESTIONS.length) * 100;
  const profileKey = `${profile.style}-${profile.vibe}-${profile.device}`;
  const profileType = PROFILE_TYPES[profileKey] || { name: 'The Survivor', emoji: '🎯', color: '#FFB800', tagline: 'You forge your own path.' };

  const handleSelect = (optionId) => {
    setSelectedOption(optionId);
    
    // Update profile
    const updated = { ...profile, [question.id]: optionId };
    setProfile(updated);
    
    // Short delay before moving to next
    setTimeout(() => {
      setSelectedOption(null);
      if (step < PROFILE_QUESTIONS.length - 1) {
        setStep(step + 1);
      } else {
        setShowResult(true);
        if (onComplete) {
          setTimeout(() => onComplete(updated), 2000);
        }
      }
    }, 400);
  };

  return (
    <div className="flex flex-col items-center px-5 py-6 min-h-[500px]">
      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key={`question-${step}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col items-center"
          >
            {/* Progress bar */}
            <div className="w-full mb-6">
              <div className="flex justify-between text-xs font-mono text-dim mb-2">
                <span>Profile {step + 1} of {PROFILE_QUESTIONS.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-ember rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-amber rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="text-center mb-8">
              <span className="text-4xl block mb-3">{question.emoji}</span>
              <h3 className="font-display text-3xl text-bone">{question.question}</h3>
            </div>

            {/* Options */}
            <div className="w-full space-y-3">
              {question.options.map((option, i) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleSelect(option.id)}
                  disabled={selectedOption !== null}
                  className={`w-full p-4 rounded-2xl border-2 transition-all active:scale-98 flex items-center gap-4 ${
                    selectedOption === option.id
                      ? 'border-amber bg-amber/10 scale-98'
                      : 'border-ember bg-smoke hover:border-amber/50'
                  }`}
                >
                  <span className="text-3xl">{option.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-mono text-bone text-lg">{option.label}</p>
                    <p className="text-dim text-xs font-mono">{option.description}</p>
                  </div>
                  {selectedOption === option.id && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-2xl"
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center"
          >
            <Mascot variant="celebrating" size={120} />
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-6 bg-smoke rounded-3xl border border-amber/30"
            >
              <p className="text-dim text-xs font-mono uppercase tracking-wider mb-2">Your survival type</p>
              <p className="font-display text-4xl mb-2" style={{ color: profileType.color }}>
                {profileType.emoji} {profileType.name}
              </p>
              <p className="text-bone font-mono text-sm mt-3">{profileType.tagline}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { PROFILE_QUESTIONS, PROFILE_TYPES };