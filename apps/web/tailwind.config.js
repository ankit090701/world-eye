/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        we: {
          bg: '#070b12',
          'bg-2': '#0b1120',
          panel: '#0e1524',
          'panel-2': '#131c30',
          border: '#1e293b',
          'border-2': '#273449',
          accent: '#22d3ee',
          'accent-2': '#38bdf8',
          warn: '#f59e0b',
          danger: '#ef4444',
          good: '#22c55e',
          info: '#818cf8',
          muted: '#64748b',
          text: '#e2e8f0',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 10px 30px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(34,211,238,0.4), 0 0 20px -4px rgba(34,211,238,0.35)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.6)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
