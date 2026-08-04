/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0d10",
        panel: "#15171c",
        panel2: "#1f2024",
        well: "#08080b",
        line: "rgba(161, 161, 170, 0.18)",
        ember: "#fc4c02",
        emberHover: "#ff5a14",
        mint: "#a3ff5f"
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Barlow Condensed", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(252, 76, 2, 0.18), 0 10px 30px rgba(252, 76, 2, 0.16)"
      },
      transitionTimingFunction: {
        snap: "cubic-bezier(0.2, 0, 0, 1)"
      }
    }
  },
  plugins: []
};
