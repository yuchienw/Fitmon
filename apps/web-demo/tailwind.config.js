/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: 'var(--color-card)',
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-on-primary)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-on-secondary)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-on-accent)',
        },
        destructive: 'var(--color-destructive)',
        retro: {
          bg: '#0b0d13',
          card: '#131722',
          border: '#262d40',
          emerald: '#10b981',
          amber: '#f59e0b',
          purple: '#8b5cf6',
          rose: '#f43f5e',
          cyan: '#06b6d4',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace', 'system-ui'],
        sans: ['"Inter"', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
