/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0B7285",
        secondary: "#14B8A6",
        bgColor: "#F8FAFC",
        accent: "#D9F99D",
        textColor: "#1E293B",
        cardBg: "#FFFFFF",
      },
      fontFamily: {
        heading: ["'Playfair Display'", "serif"],
        body: ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
