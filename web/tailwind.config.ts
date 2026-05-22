import type { Config } from "tailwindcss";

const config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.8s ease-out both",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        terminal: {
          primary: "#10b981",
          "primary-content": "#03150d",
          secondary: "#22d3ee",
          "secondary-content": "#04181c",
          accent: "#34d399",
          "accent-content": "#03150d",
          neutral: "#1c1c20",
          "neutral-content": "#e4e4e7",
          "base-100": "#0a0a0c",
          "base-200": "#141417",
          "base-300": "#272729",
          "base-content": "#ededed",
          info: "#38bdf8",
          success: "#10b981",
          warning: "#f5b50a",
          error: "#f0506b",
          "--rounded-box": "0.85rem",
          "--rounded-btn": "0.55rem",
          "--rounded-badge": "1.9rem",
          "--border-btn": "1px",
          "--animation-btn": "0.2s",
          "--tab-radius": "0.5rem",
        },
      },
    ],
    darkTheme: "terminal",
    logs: false,
  },
} satisfies Config & { daisyui: unknown };

export default config;
