import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Playfair Display", "var(--font-display)", "serif"],
        body: ["Source Sans 3", "var(--font-body)", "sans-serif"],
        mono: ["Space Mono", "var(--font-mono)", "monospace"],
      },
      colors: {
        obsidian: "#08070b",
        void: "#0d0c12",
        brass: {
          DEFAULT: "#d4a574",
          bright: "#f5c87a",
          dim: "#8b6914",
        },
        copper: "#b87333",
        silver: {
          DEFAULT: "#9ca3af",
          bright: "#d1d5db",
        },
        cream: {
          DEFAULT: "#f5f3ef",
          dim: "#c9c5bd",
        },
        charcoal: {
          DEFAULT: "#1a1816",
          light: "#2a2520",
        },
        amber: {
          DEFAULT: "#f59e0b",
          glow: "rgba(245, 158, 11, 0.15)",
        },
        // Keep some shadcn compatibility
        background: "hsl(var(--background, 220 20% 4%))",
        foreground: "hsl(var(--foreground, 40 20% 95%))",
        border: "hsl(var(--border, 30 10% 15%))",
        input: "hsl(var(--input, 30 10% 15%))",
        ring: "hsl(var(--ring, 35 50% 45%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 35 50% 64%))",
          foreground: "hsl(var(--primary-foreground, 220 20% 4%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 30 10% 12%))",
          foreground: "hsl(var(--secondary-foreground, 40 20% 85%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 30 10% 12%))",
          foreground: "hsl(var(--muted-foreground, 30 10% 50%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 35 70% 50%))",
          foreground: "hsl(var(--accent-foreground, 220 20% 4%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 70% 50%))",
          foreground: "hsl(var(--destructive-foreground, 0 0% 98%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 220 15% 8%))",
          foreground: "hsl(var(--card-foreground, 40 20% 95%))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover, 220 15% 8%))",
          foreground: "hsl(var(--popover-foreground, 40 20% 95%))",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(245, 158, 11, 0.15)",
        "glow-strong": "0 0 40px rgba(245, 158, 11, 0.25)",
        panel:
          "0 4px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(212, 165, 116, 0.1)",
        "panel-hover":
          "0 8px 32px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.1)",
      },
      backgroundImage: {
        "brass-gradient": "linear-gradient(135deg, #d4a574, #8b6914)",
        "brass-gradient-bright": "linear-gradient(135deg, #f5c87a, #d4a574)",
        "panel-gradient":
          "linear-gradient(145deg, rgba(26, 24, 22, 0.95), rgba(13, 12, 18, 0.98))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in-up 0.6s ease-out forwards",
        "spin-slow": "spin 120s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 4px #d4a574, 0 0 8px rgba(245, 158, 11, 0.15)",
          },
          "50%": {
            boxShadow: "0 0 8px #f5c87a, 0 0 16px rgba(245, 158, 11, 0.15)",
          },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [animate],
};

export default config;
