/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0d10",
        panel: "#15171c",
        line: "rgba(161, 161, 170, 0.18)",
        ember: "#ff3f87",
        mint: "#a3ff5f"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255, 63, 135, 0.18), 0 10px 30px rgba(255, 63, 135, 0.16)"
      }
    }
  },
  plugins: []
};
