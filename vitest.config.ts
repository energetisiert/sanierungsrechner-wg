import { defineConfig } from 'vitest/config';

/**
 * Eigene Config, um zu verhindern, dass Vitest beim Verzeichnis-Upwalk die
 * vitest.config.ts des benachbarten foerderrechner-wg-Projekts eine Ebene
 * höher findet und verwendet (dieses Projekt liegt als eigenständiges
 * Next.js-Projekt in einem Unterordner davon).
 */
export default defineConfig({
  test: {
    environment: 'node',
  },
});
