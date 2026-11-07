/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
        display: ["Poppins", "Nunito", "sans-serif"],
      },
      colors: {
        primary: { 50: "#f5f2fc", 100: "#e9e3f8", 200: "#d3c8f0", 500: "#6a4bc0", 600: "#5a3fa8", 700: "#4a3290", 800: "#3c2877", 900: "#2e1f5c" },
        accent: { 50: "#e6fcf9", 400: "#2ee6d0", 500: "#00d4bf", 600: "#00b5a4" },
      },
    },
  },
  plugins: [],
};
