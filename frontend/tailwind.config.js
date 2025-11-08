/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cies: {
          50:  '#EAF7F7',
          100: '#C8ECEC',
          200: '#93D8D8',
          300: '#5DC3C3',
          400: '#26A1A1',
          500: '#007979',
          600: '#005E5E',
          700: '#004747', // darker & richer teal — great for navbar
          800: '#003333', // deep teal-black tone
          900: '#001F1F', // almost black with teal undertone
        },
      },
    },
  },
  plugins: [],
};
