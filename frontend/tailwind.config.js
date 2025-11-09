/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SCADA-inspired color palette
        primary: {
          DEFAULT: '#135bec', // Main primary color from design
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#135bec', // Updated to match design
          700: '#0d47c1',  // Darker shade
          800: '#1e40af',
          900: '#1e3a8a',
        },
        status: {
          'normal': '#10b981',    // green
          'warning': '#f59e0b',   // amber
          'alarm': '#ef4444',     // red
          'offline': '#6b7280',   // gray
          'maintenance': '#8b5cf6' // purple
        },
        industrial: {
          'dark-blue': '#1e3a8a',
          'steel': '#475569',
          'control': '#334155',
        }
      },
      fontFamily: {
        'mono': ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}