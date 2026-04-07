import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    coverage: {
      include: ["src/lib/domain/**/*.ts"],
      provider: "v8",
      reporter: ["text", "html"],
    },
    environment: "node",
  },
});
