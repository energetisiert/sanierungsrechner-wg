import path from 'node:path';
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
  resolve: {
    alias: {
      // engine.ts importiert 'server-only' als Bundling-Schutz; im Node-
      // Testlauf gibt es keinen React-Server-Kontext, daher wird das Paket
      // hier gestubbt (matcht das gleiche Muster in Gebäudeabgrenzung).
      'server-only': path.resolve(__dirname, 'src/test/server-only-stub.ts'),
    },
  },
});
