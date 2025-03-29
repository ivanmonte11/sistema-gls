/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary':  '#319a37',
        'secondary': '#191919',
        'third': '#bf0a33'
      },
    },
  },
  plugins: [],
};