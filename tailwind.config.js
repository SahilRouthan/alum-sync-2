import colors from "tailwindcss/colors";

const withAlpha = (name) => ({ opacityValue }) => {
  if (opacityValue === undefined || String(opacityValue).startsWith("var(")) {
    return `var(${name})`;
  }
  const pct = +(Number(opacityValue) * 100).toFixed(2);
  return `color-mix(in oklab, var(${name}) ${pct}%, transparent)`;
};

/** @type {import('tailwindcss').Config} */
export default {
  important: ".alumsync-app",
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/layouts/**/*.{js,jsx}",
    "./src/components/app/**/*.{js,jsx}",
    "./src/context/**/*.{js,jsx}",
    "./src/dashboard/**/*.{js,jsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        display: ['"Sora"', '"Plus Jakarta Sans"', "sans-serif"],
        sora: ["Inter", '"Sora"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#2e1065",
        },
        background: withAlpha("--background"),
        foreground: withAlpha("--foreground"),
        surface: withAlpha("--surface"),
        "surface-2": withAlpha("--surface-2"),
        "surface-3": withAlpha("--surface-3"),
        card: withAlpha("--card"),
        "card-foreground": withAlpha("--card-foreground"),
        popover: withAlpha("--popover"),
        "popover-foreground": withAlpha("--popover-foreground"),
        primary: withAlpha("--primary"),
        "primary-foreground": withAlpha("--primary-foreground"),
        "primary-soft": withAlpha("--primary-soft"),
        secondary: withAlpha("--secondary"),
        "secondary-foreground": withAlpha("--secondary-foreground"),
        muted: withAlpha("--muted"),
        "muted-foreground": withAlpha("--muted-foreground"),
        accent: withAlpha("--accent"),
        "accent-foreground": withAlpha("--accent-foreground"),
        violet: { ...colors.violet, DEFAULT: withAlpha("--violet") },
        cyan: { ...colors.cyan, DEFAULT: withAlpha("--cyan") },
        success: withAlpha("--success"),
        warning: withAlpha("--warning"),
        destructive: withAlpha("--destructive"),
        "destructive-foreground": withAlpha("--destructive-foreground"),
        border: withAlpha("--border"),
        "border-strong": withAlpha("--border-strong"),
        input: withAlpha("--input"),
        ring: withAlpha("--ring"),

        /* AlumSync Feature Dashboard Aliases */
        "bg-main": withAlpha("--bg-main"),
        "card-bg": withAlpha("--card-bg"),
        "primary-violet": withAlpha("--primary-violet"),
        "accent-violet": withAlpha("--accent-violet"),
        "text-main": withAlpha("--text-main"),
        "text-muted": withAlpha("--text-muted"),
        "border-subtle": withAlpha("--border-subtle"),
        "input-bg": withAlpha("--input-bg"),
        "input-border": withAlpha("--input-border"),
        "hover-bg": withAlpha("--hover-bg"),
      },
      borderRadius: {
        "as-card": "32px",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        "card-deep": "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};
