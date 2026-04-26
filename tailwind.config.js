/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        blood: '#FF1A1A',
        ash: '#0D0D0D',
        smoke: '#1A1A1A',
        ember: '#2A2A2A',
        bone: '#F0EDE8',
        amber: '#FFB800',
        neon: '#00FF94',
        dim: '#888888',
      },
      animation: {
        'pulse-blood': 'pulse-blood 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'count-drop': 'count-drop 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow': 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-blood': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 26, 26, 0.5)' },
          '50%': { boxShadow: '0 0 0 16px rgba(255, 26, 26, 0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'count-drop': {
          '0%': { transform: 'translateY(-16px) scale(1.2)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'glow': {
          '0%, 100%': { textShadow: '0 0 20px rgba(255,26,26,0.3)' },
          '50%': { textShadow: '0 0 40px rgba(255,26,26,0.8), 0 0 80px rgba(255,26,26,0.3)' },
        },
      },
    },
  },
  plugins: [],
}
