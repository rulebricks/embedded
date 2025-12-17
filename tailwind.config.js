const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  // Scope all utilities to .rulebricks-embed for isolation from host apps
  important: ".rulebricks-embed",
  // Disable preflight (base resets) to avoid conflicts with host app styles
  corePlugins: {
    preflight: false,
  },
  safelist: [
    // All color variants for common utilities
    {
      pattern:
        /^(bg|text|border|ring|divide)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900|950)$/,
    },
    {
      pattern: /^(bg|text|border)-(black|white|transparent)$/,
    },
    // Hover variants
    {
      pattern:
        /^(bg|text|border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900|950)$/,
      variants: ["hover"],
    },
    "transition",
    "duration-75",
    "duration-100",
    "ease-out",
    "transform",
    "scale-95",
    "scale-100",
    "opacity-0",
    "opacity-100",
  ],
  theme: {
    extend: {
      animation: {
        keyframes: {
          "infinite-scroll": {
            from: { transform: "translateX(0)" },
            to: { transform: "translateX(-100%)" },
          },
          enter: {
            "0%": { transform: "scale(0.9)", opacity: 0 },
            "100%": { transform: "scale(1)", opacity: 1 },
          },
          leave: {
            "0%": { transform: "scale(1)", opacity: 1 },
            "100%": { transform: "scale(0.9)", opacity: 0 },
          },
          "slide-in": {
            "0%": { transform: "translateY(-100%)" },
            "100%": { transform: "translateY(0)" },
          },
          "pop-in": {
            "0%": {
              transform: "translateX(-8px) scale(0.8)",
              opacity: 0,
            },
            "100%": {
              transform: "translateX(0) scale(1)",
              opacity: 1,
            },
          },
        },
      },
      colors: {
        // for rulebricks site and editor wide color customizations
        white: "#ffffff",
        black: "#101010",
        // editor-specific
        editorBlack: "#2c2c2c",
        editorSelectBlack: "#111111",
        editorDisabledGray: "#b3b3b3",
        editorBgGray: "#f5f5f5",
        editorBorderGray: "#e6e6e6",
        editorSelected: "#0d99ff",
        editorSelectedHover: "#bde3ff",
        editorSelectedBg: "#e5f4ff",
      },
      fontFamily: {
        sans: ["Archivo", ...fontFamily.sans],
        title: ["Archivo", "system-ui"],
        mono: ["JetBrains Mono", "Source Code Pro", "Courier", "monospace"],
        serif: ["Lora"],
      },
      fontSize: {
        base: ["1rem"],
      },
      borderRadius: {
        sm: "0.175rem",
        md: "0.275rem",
      },
    },
  },
  plugins: [],
};
