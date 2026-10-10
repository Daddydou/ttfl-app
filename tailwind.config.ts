import type { Config } from "tailwindcss";

// Les couleurs viennent de variables CSS (voir app/globals.css) : clair et
// sombre se règlent à un seul endroit, et l'opacité (bg-out/10) fonctionne.
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        surface: { DEFAULT: v("surface"), 2: v("surface-2") },
        fill: v("fill"),
        thumb: v("thumb"),
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        fg: { DEFAULT: v("fg"), muted: v("fg-muted"), faint: v("fg-faint") },
        "on-accent": v("on-accent"),
        // Accent = orange ballon de basket. 400 = texte, 500 = fond plein.
        court: { 400: v("accent"), 500: v("accent-fill"), 600: v("accent-press") },
        avail: v("avail"),
        quest: v("quest"),
        doubt: v("doubt"),
        out: v("out"),
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "var(--font-inter)",
          "Segoe UI",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
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
