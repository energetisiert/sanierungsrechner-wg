# Sanierungsrechner WG

Sanierungskosten grob schätzen und die günstigste Förderung finden: BEG-Einzelmaßnahmen (Variante A), KfW 261 Effizienzhaus inkl. kombiniertem Heizungstausch KfW 458 (Variante B) und Steuerbonus § 35c allein (Variante C) im direkten Vergleich — inklusive einer Kostenschätzung nach Gewerken und einer Amortisationsrechnung für den Eigenanteil.

Next.js (App Router, Server Actions) · Supabase (Rate Limiting) · Vercel BotID · Tailwind CSS.

Eigenständiges Projekt neben dem `foerderrechner-wg`-Projekt eine Ebene höher in diesem Ordner (`5 - WG - Sanierungsrechner/`) — eigenes `package.json`, eigenes Git-Repository, eigenständig deploybar, gleiches Sicherheits- und Design-Muster wie der [CO2-Aufteilungsrechner](../../4%20-%20CO2-Rechner/) und der [Gebäudeabgrenzungsrechner](../../3%20-%20Gebäudeabgrenzung/).

## Entwicklung

```bash
npm install
cp .env.example .env.local   # Werte eintragen (für lokale Arbeit optional)
npm run dev
```

## Tests

```bash
npx vitest run
```

Prüft `src/lib/calculator/engine.ts` gegen die vollständige Regressionssuite aus dem Handover-Prototyp (`foerderlogik.test.js`, 19 Prüfungen, siehe `../../Wirtschaftlichkeitsrechner/`): Referenzfall der Excel-Kundendokumentation, Einkommensstaffel mit Familienzuschlag, den 70/80-%-Deckel bei KfW 458, den Denkmal-Tilgungszuschuss-Fix, die WPB+SerSan-Kumulierungsgrenze, die additive NH-Klasse, den gemeinsamen BEG-EM-Fördertopf für Hülle und Anlagentechnik, die WE-gestaffelte iSFP-Schwelle und den Rechtsstand ALT als Kontrollgruppe.

```bash
npm run typecheck
```

## Struktur

- `src/lib/calculator/` — reine, DOM-freie Förderlogik (`engine.ts`, `types.ts`). 1:1-Portierung von `foerderlogik.js` aus dem Handover-Prototyp im Ordner `Wirtschaftlichkeitsrechner/`; einzige Quelle der Wahrheit, wird ausschließlich serverseitig aufgerufen (`app/rechner/actions.ts`). **Nie in Client-Komponenten importieren.**
- `src/lib/calculator/gewerke.ts` — Marktpreis-Stammdaten (Kostenpositionen je Gewerk) für die Kostenschätzungs-Hilfe. Reine Anzeige-/Referenzdaten, keine Förderlogik — darf im Client verwendet werden (`GewerkeKostenCard.tsx`).
- `src/lib/security/` — Bulletproof Layer: Origin-/Referer-Enforcement, kurzlebige signierte Request-Tokens, IP-Hash-Rate-Limiting, Honeypot-Prüfung.
- `src/app/rechner/` — Seite (stellt das Request-Token aus), Server Action (alle Security-Checks + Engine-Aufruf).
- `src/components/rechner/` — Formular-Karten (Liegenschaft, Förderprofil, Gewerke-Kostenschätzung, Kosten, Wirtschaftlichkeit), Ergebnispanel, Druckreport.
- `supabase/migrations/` — `sanierung_rate_limits`-Tabelle und RPC `sanierung_rate_limit_hit` (60 Anfragen/Minute je `ip_hash`), SECURITY DEFINER mit `EXECUTE` für `anon` — kein Service-Role-Key nötig.

## Fachliche Grundlage

Die Förderlogik ist die eigenständige Implementierung der öffentlichen Förderregeln von BAFA, KfW und BMF (BEG EM, KfW 458/261, § 35c EStG), Rechtsstand BEG-Reform 08.07.2026 / Inkrafttreten 21.07.2026 — 1:1 identisch zur Excel-Referenz „Kundendokument Sanierung & Förderung 2026 energetisiert" und regressionsgetestet dagegen. Details, Korrekturen gegenüber der Vorversion und bekannte offene Punkte: `../../Wirtschaftlichkeitsrechner/README_Sanierungsrechner.md`.

Bekannte Unsicherheiten (Stand der finalen BEG-Richtlinie im Bundesanzeiger, WPB für Einzelmaßnahmen ab Q1/2027, EU-Wärmepumpen-Wertschöpfungsbonus, eine nicht bestätigte 3-Jahres-Sperrfrist) sind zusätzlich im Rechner selbst unter „Bekannte Unsicherheiten & offene Punkte" dokumentiert.

## Security-Architektur (Anti-Scraping)

Identisches Muster wie im CO2-Aufteilungsrechner und im Gebäudeabgrenzungsrechner, damit die Anti-Scraping-Schicht über alle Tools hinweg einheitlich ist. Die Berechnung läuft als Next.js Server Action — Fördersätze, Deckel-Staffeln und Degressionen landen nie im Client-Bundle, der Client bekommt ausschließlich das angezeigte Ergebnisobjekt. Reihenfolge der Checks in `app/rechner/actions.ts`:

1. **Honeypot** — unsichtbares Feld `website_url`; gefüllt ⇒ lautloser Abbruch.
2. **Origin-/Referer-Enforcement** — Allowlist über `ALLOWED_ORIGINS` (Default: `sanierungsrechner.energetisiert.de`, `energetisiert.de`), ergänzt um Vercel-Preview-URLs und lokalen Dev-Server (`src/lib/security/guards.ts`).
3. **Signiertes Request-Token** — HMAC-SHA256, wird beim Seitenrender ausgestellt, läuft nach 10 Minuten ab. Bei Ablauf holt der Client transparent ein frisches Token und wiederholt die Berechnung einmalig, statt hart zu scheitern.
4. **Vercel BotID** — `checkBotId()` serverseitig, kein sichtbares Captcha.
5. **Rate Limiting** — max. 60 Anfragen/Minute je `SHA-256(IP + IP_SALT)` über die Supabase-RPC; ohne konfiguriertes Supabase oder bei RPC-Fehlern greift ein In-Memory-Fallback pro Serverinstanz. Es werden keine Klardaten-IPs gespeichert (DSGVO).

`app/robots.ts` erlaubt die Landingpage und sperrt `/api/` und `/_next/` für Crawler.

## DSGVO / Rechtliches

Zero-Cookie-Strategie: keine Marketing- oder Tracking-Cookies, kein Cookie-Banner nötig. Impressum und Datenschutz verlinken im Footer direkt auf `energetisiert.de/impressum` bzw. `energetisiert.de/datenschutz`.

## Deployment (Vercel)

1. Eigenes Supabase-Projekt anlegen, Migrationen unter `supabase/migrations/` ausführen (Reihenfolge nach Dateiname).
2. Environment Variables setzen: `IP_SALT`, `REQUEST_TOKEN_SECRET` (siehe `.env.example`) — ausschließlich in Vercel, nie im Repo. `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sind unkritisch (durch RLS geschützt). Ein Service-Role-Key wird nicht benötigt. BotID braucht keinen Key.
3. Domain `sanierungsrechner.energetisiert.de` aufschalten (Default-Allowlist in `src/lib/security/guards.ts` erwartet diese Subdomain; abweichende Domains über `ALLOWED_ORIGINS` setzen).
