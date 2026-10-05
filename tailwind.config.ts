import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        // Vivid "Naija green" — the brand colour, used for money-in and primary actions
        primary: {
          50: "#effff7",
          100: "#d8ffea",
          200: "#a9ffd1",
          300: "#6fffb0",
          400: "#20eb82",
          500: "#00d66f",
          600: "#00ad59",
          700: "#078847",
          800: "#096b3b",
          900: "#075832",
          950: "#042f1c",
        },
        // Warm sunset coral — requests and "someone is waiting on you"
        coral: {
          50: "#fff4ed",
          100: "#ffe5d4",
          200: "#ffc7a8",
          300: "#ffa071",
          400: "#ff6d38",
          500: "#fe4a11",
          600: "#ef3007",
          700: "#c62108",
          800: "#9d1d0f",
          900: "#7e1b10",
        },
        // Palm-oil gold — celebration and highlights
        sun: {
          100: "#fff6c6",
          200: "#ffec88",
          300: "#ffdb49",
          400: "#ffc91f",
          500: "#f9a806",
        },
        ink: {
          DEFAULT: "#171915",
          soft: "#3f433b",
          muted: "#6f746a",
        },
        cream: "#f7f7e9",
      },
      boxShadow: {
        glow: "0 18px 40px -20px rgba(0, 173, 89, 0.45)",
        "glow-coral": "0 18px 40px -16px rgba(254, 74, 17, 0.5)",
        card: "0 1px 2px rgba(23, 25, 21, 0.04), 0 10px 30px -22px rgba(23, 25, 21, 0.22)",
      },
      keyframes: {
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "step-in": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "60%": { transform: "scale(1.12)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        draw: {
          "0%": { strokeDashoffset: "48" },
          "100%": { strokeDashoffset: "0" },
        },
        "ring-out": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        confetti: {
          "0%": { transform: "translate(0, 0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translate(var(--dx), var(--dy)) rotate(var(--rot))",
            opacity: "0",
          },
        },
        progress: {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(12px, -10px) scale(1.06)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in": "fade-in 200ms ease-out",
        "step-in": "step-in 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        "rise-in": "rise-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        pop: "pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        draw: "draw 420ms 260ms ease-out both",
        "ring-out": "ring-out 1.6s ease-out infinite",
        confetti: "confetti 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        progress: "progress 1500ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        float: "float 9s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
