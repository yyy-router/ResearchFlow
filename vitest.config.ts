import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "app/**/page.tsx",
      "app/**/layout.tsx",
      "app/**/route.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
