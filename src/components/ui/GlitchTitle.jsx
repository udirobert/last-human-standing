import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * GlitchTitle - A premium retro-sci-fi text reveal that cycles through 
 * random characters before settling into the final text.
 */
export default function GlitchTitle({ text, className = "", delay = 0 }) {
  const [displayedText, setDisplayedText] = useState(text);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setStarted(true), delay * 1000);
      return () => clearTimeout(t);
    }
    setStarted(true);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let interval;
    let iterations = 0;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$@&*?%!";

    interval = setInterval(() => {
      setDisplayedText(
        text
          .split("")
          .map((char, index) => {
            if (char === " " || char === "\n") return char;
            if (index < iterations) {
              return text[index];
            }
            // 30% chance to show a random character, otherwise show final character or space
            return Math.random() > 0.3 
              ? chars[Math.floor(Math.random() * chars.length)] 
              : char;
          })
          .join("")
      );

      if (iterations >= text.length) {
        clearInterval(interval);
      }
      iterations += 0.5; // Settle 1 character every 2 intervals (fast and satisfying)
    }, 25);

    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <motion.h1
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
      style={{ whiteSpace: "pre-line" }}
    >
      {displayedText}
    </motion.h1>
  );
}
