import { useEffect, useCallback, useState } from 'react';

// Sound context singleton
let audioContext = null;
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Generate procedural sounds (no external files needed)
const tones = {
  click: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  },
  success: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  },
  error: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  },
  victory: (ctx) => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
  },
  tick: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.02);
  },
};

// Ambient drone generator
const createAmbientDrone = (ctx) => {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.03, ctx.currentTime);
  
  const oscillators = [];
  const frequencies = [55, 110, 165, 220];
  
  frequencies.forEach(freq => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(filter);
    filter.connect(gain);
    oscillators.push(osc);
    osc.start();
  });
  
  return { gain, oscillators, stop: () => {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillators.forEach(o => o.stop(ctx.currentTime + 0.5));
  }};
};

export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('sound_enabled');
    return stored !== 'false';
  });
  const [ambient, setAmbient] = useState(null);

  const play = useCallback((soundName) => {
    if (!enabled) return;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const sound = tones[soundName];
      if (sound) sound(ctx);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      localStorage.setItem('sound_enabled', !prev);
      return !prev;
    });
  }, []);

  const startAmbient = useCallback(() => {
    if (!enabled || ambient) return;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      setAmbient(createAmbientDrone(ctx));
    } catch (e) {
      console.warn('Ambient sound failed:', e);
    }
  }, [enabled, ambient]);

  const stopAmbient = useCallback(() => {
    if (ambient) {
      ambient.stop();
      setAmbient(null);
    }
  }, [ambient]);

  useEffect(() => {
    return () => {
      if (ambient) ambient.stop();
    };
  }, [ambient]);

  return {
    play,
    toggle,
    enabled,
    startAmbient,
    stopAmbient,
  };
}

// Hook for sound context initialization (call on user interaction)
export function useInitSound() {
  const init = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }, []);

  return init;
}