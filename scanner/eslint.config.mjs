import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    // keyboard.js contains functions serialised into the page via
    // page.evaluate(), which execute in the browser context.
    files: ["keyboard.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
