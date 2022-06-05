module.exports = {
  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: ["prettier", "unused-imports"],
  extends: [
    "airbnb",
    "airbnb-typescript",
    "plugin:prettier/recommended",
    "plugin:jest/recommended",
  ],
  rules: {
    "func-names": "off",
    "prettier/prettier": "error",
    "no-unused-vars": "off", // or "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
  },
};
