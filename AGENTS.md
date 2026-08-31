# Sanierungsrechner WG — Regeln für Agenten

- `src/lib/calculator/engine.ts` ist die einzige Quelle der Wahrheit für die Förderlogik (1:1-Portierung von `foerderlogik.js` aus `../../Wirtschaftlichkeitsrechner/`). Änderungen an Formeln oder Parametern nur dort, danach `npx vitest run` — die Suite (Portierung von `foerderlogik.test.js`) muss grün bleiben.
- `src/lib/calculator/gewerke.ts` enthält nur Marktpreis-Referenzdaten (keine Förderlogik) und darf im Client verwendet werden. `engine.ts`, `types.ts` und `src/lib/security/` dürfen **nie** in Client-Komponenten (`'use client'`) importiert werden — die Berechnung läuft ausschließlich über die Server Action `src/app/rechner/actions.ts`.
- Der Client bekommt nur angezeigte Werte. Keine Tabellen, Koeffizienten oder Zwischenschritte in Props, State oder Antwort-Payloads ergänzen.
- Design nach Brand Guide energetisiert. v1.1: Farben/Token stehen in `src/app/globals.css`, Schriften Montserrat (Display) und Instrument Sans (Body). UI-Muster wie im Förder-, Heizlast- und CO2-Rechner (Cards, dunkles Ergebnispanel, Druckreport).
- Sprache der Oberfläche und der Kommentare: Deutsch.
