import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette sombre (usage nocturne, matchs NBA la nuit).
        ink: {
          950: "#0a0e14",
          900: "#0f1520",
          850: "#141c2b",
          800: "#1a2536",
          700: "#25334a",
          600: "#33445f",
        },
        // Accent = orange ballon de basket.
        court: {
          400: "#ff9f43",
          500: "#f97316",
          600: "#ea580c",
        },
        avail: "#22c55e",
        quest: "#f59e0b",
        doubt: "#fb923c",
        out: "#ef4444",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.1)", opacity: "0" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
