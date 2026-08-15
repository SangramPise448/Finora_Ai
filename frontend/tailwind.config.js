/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        finora: {
          bg: '#050816',
          'bg-alt': '#0a0f1e',
          card: '#111631',
          border: 'rgba(255, 255, 255, 0.15)',
          primary: '#7C3AED',
          'primary-light': '#a78bfa',
          secondary: '#4F46E5',
          accent: '#22C55E',
          'accent-light': '#4ade80',
          glow: '#38BDF8',
          danger: '#EF4444',
          warning: '#f59e0b',
          text: '#FFFFFF',
          subtitle: '#94A3B8',
          muted: '#64748b',
        }
      },
      backgroundImage: {
        'glass-radial': 'radial-gradient(120% 120% at 50% 10%, rgba(124, 58, 237, 0.15) 0%, rgba(5, 8, 22, 0) 60%)',
        'glass-card': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'hero-gradient': 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #38BDF8 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-primary': '0 0 20px rgba(124, 58, 237, 0.4)',
        'neon-accent': '0 0 20px rgba(34, 197, 94, 0.3)',
        'neon-glow': '0 0 20px rgba(56, 189, 248, 0.3)',
        'glass': '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 10s ease-in-out infinite',
        'blob-drift': 'blob-drift 18s infinite alternate ease-in-out',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
    },
  },
  plugins: [],
}
