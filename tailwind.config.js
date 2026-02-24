/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        notion: {
          bg: '#191919',
          surface: '#1f1f1f',
          hover: '#252525',
          border: '#2e2e2e',
          sidebar: '#1b1b1b',
          'text-primary': '#e0e0e0',
          'text-muted': '#9b9b9b',
          'text-faint': '#6b6b6b',
          blue: '#2196f3',
          'blue-dim': '#1a2a3a',
          'blue-text': '#4a9edd',
        },
      },
      fontSize: {
        'notion-sm': ['13px', { lineHeight: '1.4' }],
        'notion-base': ['14px', { lineHeight: '1.5' }],
        'notion-lg': ['16px', { lineHeight: '1.5' }],
        'notion-title': ['28px', { lineHeight: '1.3', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}
