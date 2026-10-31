/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#FF5E00',
          600: '#ea5400',
          700: '#FF5E00',
          800: '#c2410c',
          900: '#7c2d12',
          DEFAULT: '#FF5E00',
        },
        incoming: {
          50: '#064e3b',
          100: '#065f46',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
        },
        expense: {
          50: '#4c0519',
          100: '#881337',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
