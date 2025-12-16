/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  // Scope all utilities to .rulebricks-embed for isolation from host apps
  important: ".rulebricks-embed",
  // Disable preflight (base resets) to avoid conflicts with host app styles
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // Editor colors matching the main app
        editorBlack: "var(--rb-color-editor-black, #1a1a1a)",
        editorBgGray: "var(--rb-color-editor-bg-gray, #f5f5f5)",
        editorBorderGray: "var(--rb-color-editor-border-gray, #e5e5e5)",
        editorSelectBlack: "var(--rb-color-editor-select-black, #2a2a2a)",
        editorSelected: "var(--rb-color-editor-selected, #3b82f6)",
        editorDisabledGray: "var(--rb-color-editor-disabled-gray, #9ca3af)",
      },
    },
  },
  plugins: [],
};
