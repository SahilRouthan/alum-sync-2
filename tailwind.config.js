/** @type {import('tailwindcss').Config} */
export default {
  important: "#alumsync-app",
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/layouts/**/*.{js,jsx}",
    "./src/components/app/**/*.{js,jsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
        display: ['"Sora"', '"Plus Jakarta Sans"', "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#2e1065",
        },
      },
    },
  },
  plugins: [],
};
