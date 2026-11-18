import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["src/theme/**/*.test.tsx"],
    setupFiles: ["src/theme/test-setup.ts"],
  },
  resolve: { alias: { "~": path.resolve(__dirname, "./src") } },
});
