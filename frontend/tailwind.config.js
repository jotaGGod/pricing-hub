/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0f14",
        panel: "#111821",
        line: "rgba(148, 163, 184, 0.22)",
        ember: "#ff7a1a",
        mint: "#3cff9b"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(60, 255, 155, 0.16), 0 18px 60px rgba(0,0,0,0.28)"
      }
    }
  },
  plugins: []
};
