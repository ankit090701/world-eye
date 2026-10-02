/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        we: {
          bg: '#f4f6fa',
          'bg-2': '#eef1f6',
          panel: '#ffffff',
          'panel-2': '#f3f5f9',
          border: '#e3e7ee',
          'border-2': '#d2d8e2',
          accent: '#4f46e5',
          'accent-2': '#6366f1',
          warn: '#d97706',
          danger: '#dc2626',
          good: '#16a34a',
          info: '#6366f1',
          muted: '#64748b',
          text: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -12px rgba(15,23,42,0.18)',
        card: '0 1px 2px rgba(15,23,42,0.05), 0 4px 12px -6px rgba(15,23,42,0.10)',
        glow: '0 0 0 1px rgba(79,70,229,0.25), 0 6px 16px -6px rgba(79,70,229,0.35)',
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
