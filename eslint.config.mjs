import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  // 全局忽略
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**", ".wrangler/**", "**/*.d.ts"],
  },
  // TypeScript 规则
  ...tseslint.configs.recommended,
  // Astro 规则
  ...eslintPluginAstro.configs.recommended,
  // 禁用与 Prettier 冲突的格式化规则，让 Prettier 专注排版，ESLint 专注代码质量
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
