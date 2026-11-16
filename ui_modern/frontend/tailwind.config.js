/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#070a13',
          darker: '#04060a',
          surface: '#0d1322',
          surfaceBorder: '#1e293b',
          emerald: '#10b981',
          cyan: '#06b6d4',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          crimson: '#f43f5e',
          neonBlue: '#38bdf8',
          neonPink: '#ec4899',
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'ripple': 'ripple 2s linear infinite',
        'glow': 'glow 2.5s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'ripple': {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(139, 92, 246, 0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
