import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F2F4F7",
        surface: "#FFFFFF",
        "text-primary": "#111827",
        "text-secondary": "#6B7280",
        "text-muted": "#9CA3AF",
        // Brand
        purple: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          500: "#7C3AED",
          600: "#6D28D9",
        },
        blue: {
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
        },
        // Status
        red: { 400: "#F87171", 500: "#EF4444" },
        amber: { 400: "#FBBF24", 500: "#F59E0B" },
        green: { 400: "#34D399", 500: "#10B981" },
        cyan: { 400: "#22D3EE", 500: "#06B6D4" },
        orange: { 400: "#FB923C", 500: "#F97316" },
        // Alert
        alert: { bg: "#FFF7ED", icon: "#F97316" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-lg": "0 4px 12px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
