const path = require("path");

module.exports = {
  plugins: {
    // Inline @import statements (including from node_modules)
    "postcss-import": {
      resolve: (id) => {
        if (
          id.startsWith("react-data-grid") ||
          id.startsWith("react-datetime") ||
          id.startsWith("highlight.js")
        ) {
          return require.resolve(id);
        }
        return id;
      },
    },
    "postcss-url": {
      url: "inline",
      maxSize: 100,
      basePath: [
        path.resolve(__dirname, "src"),
        path.resolve(__dirname, "node_modules"),
      ],
    },
    // Enable CSS nesting for scoped styles under .rulebricks-embed
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
