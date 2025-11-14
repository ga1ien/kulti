import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "**/*.config.js",
      "lib/logger.ts"
    ]
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": typescriptEslint
    },
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "no-undef": "off" // TypeScript handles this
    }
  },
  {
    // k6 load test files
    files: ["tests/load/**/*.js"],
    languageOptions: {
      globals: {
        __ENV: "readonly",
        __VU: "readonly",
        __ITER: "readonly",
        console: "readonly"
      }
    },
    rules: {
      "no-console": "off" // Allow console in k6 tests
    }
  }
];
