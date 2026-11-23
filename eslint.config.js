const { defineConfig } = require("eslint/config");
const globals = require("globals");
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

const commonRules = {
    semi: ["error", "always"],
    "prefer-const": "error",
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
    "no-duplicate-imports": "error",
    "no-debugger": "error",
};

module.exports = defineConfig([
    {
        files: ["**/*.{js,cjs,mjs,jsx}"],
        extends: [js.configs.recommended],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            ...commonRules,
            "no-undef": "error",
            "no-unused-vars": [
                "warn",
                {
                    args: "none",
                    caughtErrors: "none",
                },
            ],
        },
    },

    // TypeScript
    {
        files: ["**/*.{ts,cts,mts,tsx}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            ...commonRules,

            "no-undef": "off",
            "no-unused-vars": "off",

            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    args: "none",
                    caughtErrors: "none",
                },
            ],
        },
    },
]);
