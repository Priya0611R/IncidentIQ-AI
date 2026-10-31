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
        navy: {
          950: '#070b14',
          900: '#0b1120',
          850: '#10192e',
          800: '#17233f',
          700: '#1e3056',
        },
        slate: {
          850: '#151e2e',
        }
      }
    },
  },
  plugins: [],
}

