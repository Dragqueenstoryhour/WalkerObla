import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactRefreshPlugin from "eslint-plugin-react-refresh";

export default [
  // Global ignores
  {
    ignores: ["dist", "node_modules", "build", "coverage", ".replit", "uv.lock", "package-lock.json", "pyproject.toml", "test_audio*.mp3", "generated-icon.png", "server.log", "dev_output.log", "nvidia_ace-1.2.0-py3-none-any.whl", "CLAUDE.md", "ENABLE_GOOGLE_OAUTH.md", "replit.md", "SUPABASE_AUTH_README.md", "test-assignment-workflow.md", "debug-response*.json", "test-azure-speech.sh", "test-pronunciation.sh", "test-sine-16k-mono.wav", "theme.json"]
  },

  // Client-side files configuration
  {
    files: ["client/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: globals.browser,
    },
    plugins: {
      react: reactPlugin,
      "react-refresh": reactRefreshPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // Server-side TypeScript files configuration
  {
    files: ["server/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.node.json'],
      },
      globals: {
        ...globals.node,
        ...globals.jest, // For Jest config files
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "no-undef": "off", // Handled by globals
    },
  },

  // Server-side JavaScript and CommonJS files configuration
  {
    files: ["server/**/*.js", "*.{js,cjs}", "check-database.js", "debug_assignments.js", "jest.config.client.cjs", "jest.config.server.cjs", "jest.setup.client.cjs", "jest.setup.server.cjs", "test-supabase-auth.js", "test-user-activities.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest, // For Jest config files
        process: "readonly", // Explicitly define process as readonly global
        module: "readonly", // Explicitly define module as readonly global
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off", // Allow require for CJS files
      "no-undef": "off", // Handled by globals
    },
  },

  // Configuration files that might be JS but need TS parser for project reference
  {
    files: ["drizzle.config.ts", "postcss.config.js", "tailwind.config.ts", "vite.config.ts", ".eslintrc.cjs", "eslint.config.js", "types.d.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.node.json'],
      },
      globals: {
        ...globals.node,
        ...globals.jest, // For Jest config files
        process: "readonly", // Explicitly define process as readonly global
        module: "readonly", // Explicitly define module as readonly global
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "off", // Allow require for CJS files
      "no-undef": "off", // Handled by globals
    },
  },

  // Common rules for all files (if any)
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];