import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";

export default [
  // Main bundle (React component)
  {
    input: "src/index.js",
    output: [
      {
        file: "dist/index.cjs.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
      {
        file: "dist/index.esm.js",
        format: "esm",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        browser: true,
        preferBuiltins: false,
        extensions: [".js", ".jsx", ".json"],
      }),
      json(),
      commonjs({
        include: /node_modules/,
        requireReturnsDefault: "auto",
        transformMixedEsModules: true,
      }),
      babel({
        babelHelpers: "bundled",
        presets: [
          "@babel/preset-env",
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
        extensions: [".js", ".jsx"],
        exclude: "node_modules/**",
      }),
      postcss({
        inject: true, // Auto-inject CSS into JS bundle - no manual import needed
        minimize: true,
        modules: false,
        config: {
          path: "./postcss.config.js",
        },
      }),
    ],
    external: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  // Server utilities (Node.js)
  {
    input: "src/server.js",
    output: [
      {
        file: "dist/server.cjs.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
      {
        file: "dist/server.esm.js",
        format: "esm",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      babel({
        babelHelpers: "bundled",
        presets: ["@babel/preset-env"],
        extensions: [".js"],
        exclude: "node_modules/**",
      }),
    ],
    external: ["node-fetch"],
  },
];
