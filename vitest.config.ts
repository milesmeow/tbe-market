import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Vitest doesn't read tsconfig `paths`, so the `@/*` alias has to be repeated
 * here or any test importing a module that uses it fails to resolve. Mirrors
 * `"@/*": ["./*"]` in tsconfig.json — change both together.
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": rootDir },
  },
});
