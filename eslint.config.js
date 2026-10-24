const { defineConfig } = require("eslint/config");
const globals = require("globals");
const js = require("@eslint/js");

module.exports = defineConfig([
    {
        rules: {
            semi: "error",
            "prefer-const": "error",
            "no-undef": "error",
            ...js.configs.recommended.rules,
            eqeqeq: ["error", "always"],
            curly: ["error", "all"],
            "no-duplicate-imports": "error",
            "no-debugger": "error",
            "no-unused-vars": [
                "warn",
                {
                    args: "none",
                    caughtErrors: "none",
                },
            ],
        },
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
]);
