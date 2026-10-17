/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#171717',
        surface: '#262626',
        line: '#2F2F2F',
        primary: '#9E7FFF',
        secondary: '#38bdf8',
        accent: '#f472b6',
        muted: '#A3A3A3',
      },
    },
  },
  plugins: [],
}
