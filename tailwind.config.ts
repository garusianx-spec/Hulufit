import type { Config } from "tailwindcss";

/**
 * HelloFit / هلوفیت — Tailwind design system.
 * Light mode only, RTL-first, IRANYekan as the single typeface.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Every piece of type in the app resolves to IRANYekan first.
        sans: ["IRANYekan", "IRANYekanX", "Vazirmatn", "Tahoma", "system-ui", "sans-serif"],
        yekan: ["IRANYekan", "IRANYekanX", "Vazirmatn", "Tahoma", "sans-serif"],
      },
      colors: {
        canvas: "#F8FAFC",
        surface: "#FFFFFF",
        line: "#E2E8F0",
        ink: {
          DEFAULT: "#0F172A",
          muted: "#64748B",
          soft: "#94A3B8",
        },
        primary: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          DEFAULT: "#059669",
        },
        sky: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          DEFAULT: "#0284C7",
        },
        warn: { 50: "#FFFBEB", 100: "#FEF3C7", 500: "#F59E0B", 600: "#D97706" },
        danger: { 50: "#FEF2F2", 100: "#FEE2E2", 500: "#EF4444", 600: "#DC2626" },
      },
      borderRadius: {
        card: "1.25rem",
        sheet: "1.75rem",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.10)",
        sheet: "0 -8px 40px -12px rgb(15 23 42 / 0.18)",
        nav: "0 -1px 0 0 #E2E8F0",
        float: "0 10px 30px -10px rgb(5 150 105 / 0.45)",
      },
      spacing: {
        // Android TWA / notch-safe helpers.
        "safe-t": "env(safe-area-inset-top, 0px)",
        "safe-b": "env(safe-area-inset-bottom, 0px)",
        header: "3.5rem",
        nav: "4.25rem",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(-100%)" },
        },
        "pulse-dot": {
          "0%, 60%, 100%": { opacity: "0.25", transform: "translateY(0)" },
          "30%": { opacity: "1", transform: "translateY(-3px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-dot": "pulse-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
