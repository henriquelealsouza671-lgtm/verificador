/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F172A', // Fundo escuro do app
        surface: '#1E293B',    // Fundo dos cartões/inputs
      }
    },
  },
  plugins: [],
}