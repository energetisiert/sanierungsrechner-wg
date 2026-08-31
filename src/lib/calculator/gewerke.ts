/**
 * Stammdaten Kostenpositionen (Gewerke) — Hilfestellung zur Schätzung der
 * Sanierungskosten je Kostenfeld der Förderberechnung. 1:1-Portierung der
 * GEWERKE-Stammdaten aus foerderlogik.js. Marktpreise, keine Förderdaten —
 * dient ausschließlich der Kostenschätzung, nicht der Förderlogik in
 * engine.ts. Läuft wie die Förderlogik ausschließlich serverseitig
 * (app/rechner/actions.ts), damit Kalkulationsgrundlagen nicht Teil des
 * Client-Bundles werden.
 */

/** In welches Kostenfeld der LiegenschaftInput eine Position einzahlt. 'informativ' = zählt in keine Förderberechnung (z. B. PV: 0 % MwSt., keine BEG-Förderung). */
export type Kostenziel =
  | 'kostenHuelle'
  | 'kostenHeizung'
  | 'kostenUmfeld'
  | 'kostenLueftung'
  | 'kostenIsfp'
  | 'kostenPlanung'
  | 'informativ';

export interface GewerkePosition {
  name: string;
  hinweis: string;
  /** Marktüblicher Mittelwert-Preis je Einheit, in Euro. */
  mittelwert: number;
  einheit: string;
  /** Marktübliche Preisspanne als Anzeigetext. */
  spanne: string;
  /** Alternative zu einer anderen Position derselben Kategorie (z. B. Innen- statt Außendämmung). */
  alternative?: boolean;
  kostenziel: Kostenziel;
}

export interface GewerkeKategorie {
  titel: string;
  gruppe: 'huelle' | 'technik' | 'planung';
  positionen: GewerkePosition[];
}

export const GEWERKE: readonly GewerkeKategorie[] = [
  {
    titel: 'Gebäudehülle – Fassade',
    gruppe: 'huelle',
    positionen: [
      { name: 'Außenwanddämmung WDVS', hinweis: 'inkl. Gerüst, Putz, Anschlüsse', mittelwert: 280, einheit: 'm²', spanne: '180–350', kostenziel: 'kostenHuelle' },
      { name: 'Innendämmung Außenwände', hinweis: 'Alternative bei Denkmal / erhaltenswerter Fassade', mittelwert: 120, einheit: 'm²', spanne: '60–150', alternative: true, kostenziel: 'kostenHuelle' },
      { name: 'Einblas-/Kerndämmung', hinweis: 'Alternative bei zweischaligem Mauerwerk', mittelwert: 40, einheit: 'm²', spanne: '25–60', alternative: true, kostenziel: 'kostenHuelle' },
    ],
  },
  {
    titel: 'Fenster, Sonnenschutz & Außentüren',
    gruppe: 'huelle',
    positionen: [
      { name: 'Fenstertausch 3-fach', hinweis: 'Uw ≤ 0,95 W/m²K, BEG-konform', mittelwert: 850, einheit: 'm²', spanne: '700–1.000', kostenziel: 'kostenHuelle' },
      { name: 'Rollladenkästen dämmen', hinweis: 'im Bestand', mittelwert: 120, einheit: 'm²', spanne: '90–160', kostenziel: 'kostenHuelle' },
      { name: 'Sommerlicher Wärmeschutz', hinweis: 'Raffstores, Jalousien, Vorsatzrollos – DIN 4108-2', mittelwert: 1200, einheit: 'Stk.', spanne: '800–1.800', alternative: true, kostenziel: 'kostenHuelle' },
      { name: 'Haustür', hinweis: 'Ud ≤ 1,3 W/m²K', mittelwert: 2400, einheit: 'm²', spanne: '1.900–3.300', kostenziel: 'kostenHuelle' },
    ],
  },
  {
    titel: 'Dach',
    gruppe: 'huelle',
    positionen: [
      { name: 'Hauptdach Aufsparrendämmung', hinweis: 'inkl. Neueindeckung', mittelwert: 520, einheit: 'm²', spanne: '400–650', kostenziel: 'kostenHuelle' },
      { name: 'Dach Anbau', hinweis: 'Dämmung inkl. Eindeckung', mittelwert: 520, einheit: 'm²', spanne: '400–650', kostenziel: 'kostenHuelle' },
      { name: 'Dachflächenfenster', hinweis: '3-fach, U ≤ 1,0 W/m²K', mittelwert: 3000, einheit: 'm²', spanne: '2.400–3.600', kostenziel: 'kostenHuelle' },
      { name: 'Oberste Geschossdecke', hinweis: 'Alternative: unbeheizter Dachraum, U ≤ 0,24', mittelwert: 70, einheit: 'm²', spanne: '30–100', alternative: true, kostenziel: 'kostenHuelle' },
    ],
  },
  {
    titel: 'Keller',
    gruppe: 'huelle',
    positionen: [
      { name: 'Kellerdeckendämmung', hinweis: 'unterseitig', mittelwert: 160, einheit: 'm²', spanne: '60–180', kostenziel: 'kostenHuelle' },
      { name: 'Perimeterdämmung', hinweis: 'inkl. Erdarbeiten, Abdichtung, Drainage', mittelwert: 350, einheit: 'm²', spanne: '250–450', alternative: true, kostenziel: 'kostenHuelle' },
      { name: 'Kellerbodendämmung', hinweis: 'Boden gegen Erdreich, U ≤ 0,25', mittelwert: 120, einheit: 'm²', spanne: '70–160', alternative: true, kostenziel: 'kostenHuelle' },
    ],
  },
  {
    titel: 'Anlagentechnik, Heizung & Erneuerbare',
    gruppe: 'technik',
    positionen: [
      { name: 'Luft-Wasser-Wärmepumpe', hinweis: 'inkl. Speicher, hydr. Abgleich · JAZ ≥ 3,0', mittelwert: 37000, einheit: 'Stk.', spanne: '24.000–45.000', kostenziel: 'kostenHeizung' },
      { name: 'Luft-Luft-Wärmepumpe / Split', hinweis: 'Alternative · ETAs 181 % bis 12 kW', mittelwert: 15000, einheit: 'Stk.', spanne: '8.000–25.000', alternative: true, kostenziel: 'kostenHeizung' },
      { name: 'Biomasseheizung', hinweis: 'Alternative · Pellet, Hackschnitzel, Scheitholz', mittelwert: 32000, einheit: 'Stk.', spanne: '24.000–45.000', alternative: true, kostenziel: 'kostenHeizung' },
      { name: 'Solarthermie', hinweis: 'Heizungsunterstützung / Warmwasser', mittelwert: 12000, einheit: 'Stk.', spanne: '8.000–16.000', alternative: true, kostenziel: 'kostenHeizung' },
      { name: 'Fußbodenheizung', hinweis: 'Nachrüstung Fräsverfahren · Umfeldmaßnahme', mittelwert: 120, einheit: 'm²', spanne: '90–150', kostenziel: 'kostenUmfeld' },
      { name: 'Zentrale Lüftung mit WRG', hinweis: 'DIN 1946-6', mittelwert: 6500, einheit: 'Stk.', spanne: '5.000–12.000', kostenziel: 'kostenLueftung' },
      { name: 'Dezentrale Lüftung mit WRG', hinweis: 'Alternative · je Gerät inkl. Kernbohrung', mittelwert: 1400, einheit: 'Stk.', spanne: '1.000–1.800', alternative: true, kostenziel: 'kostenLueftung' },
      { name: 'Photovoltaik + Speicher', hinweis: '9,65 kWp / 7 kWh · 0 % MwSt., keine BEG-Förderung', mittelwert: 22000, einheit: 'Stk.', spanne: '18.000–26.000', kostenziel: 'informativ' },
    ],
  },
  {
    titel: 'Planung, Konzepte & Baubegleitung',
    gruppe: 'planung',
    positionen: [
      { name: 'Individueller Sanierungsfahrplan', hinweis: 'EBW-Zuschuss 50 %, max. 650 € EFH/ZFH', mittelwert: 1650, einheit: 'Stk.', spanne: '1.300–2.000', kostenziel: 'kostenIsfp' },
      { name: 'Lüftungskonzept DIN 1946-6', hinweis: 'als Fachplanung 50 % förderfähig', mittelwert: 2000, einheit: 'Stk.', spanne: '1.500–2.500', kostenziel: 'kostenPlanung' },
      { name: 'Wärmebrückenberechnung', hinweis: 'detailliert', mittelwert: 4000, einheit: 'Stk.', spanne: '3.000–5.000', kostenziel: 'kostenPlanung' },
      { name: 'LCA-/LCC-Berechnung', hinweis: 'für NH-Klasse / QNG erforderlich', mittelwert: 2500, einheit: 'Stk.', spanne: '1.500–4.000', alternative: true, kostenziel: 'kostenPlanung' },
      { name: 'Fachplanung & Baubegleitung', hinweis: 'Energieeffizienz-Experte', mittelwert: 5000, einheit: 'Stk.', spanne: '3.500–7.000', kostenziel: 'kostenPlanung' },
    ],
  },
];
