import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0b1120',
        panel: '#111a2e',
        edge: '#1e2a44',
      },
    },
  },
  plugins: [],
};

export default config;
