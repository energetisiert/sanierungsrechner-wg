/**
 * Typen der Förder- und Wirtschaftlichkeitslogik des Sanierungsrechners WG.
 * Quelle der Logik: foerderlogik.js (Handover-Prototyp), 1:1 identisch zur
 * Excel-Referenz "Kundendokument Sanierung & Förderung 2026 energetisiert".
 */

export type EhStufe =
  | 'Effizienzhaus 40'
  | 'Effizienzhaus 55'
  | 'Effizienzhaus 70'
  | 'Effizienzhaus 85'
  | 'Effizienzhaus Denkmal';

export type Antragstellertyp = 'Privatperson (selbstnutzend)' | 'Vermietend / Unternehmen / WEG';

/**
 * Eine Liegenschaft: das Gebäude (mit Anzahl Wohneinheiten), die geplanten
 * Sanierungskosten je Gewerke-Gruppe und die Boni, die für die Berechnung
 * angesetzt werden sollen. Entspricht dem Eingabeobjekt "i" aus
 * foerderlogik.js — Feldnamen bewusst 1:1 übernommen, damit die Portierung
 * gegen die Original-Testsuite überprüfbar bleibt.
 */
export interface LiegenschaftInput {
  /** Rechtsstand BEG-Reform (ab 21.07.2026) ansetzen. false = Rechtsstand ALT (praktisch ausgelaufen, siehe status()). */
  neu: boolean;
  /** Anzahl Wohneinheiten der Liegenschaft (1 = EFH). */
  we: number;
  antrag: Antragstellertyp;
  /** Individueller Sanierungsfahrplan vorhanden bzw. wird erstellt. */
  isfp: boolean;
  /** Klimageschwindigkeitsbonus beim Heizungstausch (KfW 458), nur selbstnutzend. */
  klima: boolean;
  /** Effizienzbonus — nur im Rechtsstand ALT ansetzbar, entfällt NEU ersatzlos. */
  effizienz: boolean;
  /** Zu versteuerndes Haushaltseinkommen in Euro, nur selbstnutzend relevant. */
  zve: number;
  /** Anzahl minderjähriger Kinder im Haushalt (verschiebt Einkommensgrenzen um je 10.000 €). */
  kinder: number;
  ehstufe: EhStufe;
  /** Worst-Performing-Building-Bonus (KfW 261), nicht bei EH 85/Denkmal. */
  wpb: boolean;
  /** Serielle-Sanierung-Bonus (KfW 261), nur EH 40/55, NEU zusätzlich EH 70 EE. */
  sersan: boolean;
  /** Erneuerbare-Energien-Klasse erreicht. */
  eeklasse: boolean;
  /** Nachhaltigkeits-Klasse NH/QNG. */
  nhklasse: boolean;
  /** Heizungstausch (KfW 458) wird zusammen mit dem Effizienzhaus-Antrag (KfW 261) gestellt. */
  kombi458: boolean;
  /** Kosten, die für den Steuerbonus § 35c ausgewiesen werden (Variante B/C). */
  ausl35c: number;
  /** Kosten Gebäudehülle (Fassade, Fenster, Dach, Keller). */
  kostenHuelle: number;
  /** Kosten Heizungstausch (KfW 458). */
  kostenHeizung: number;
  /** Umfeldmaßnahmen der Heizung (z. B. Fußbodenheizung, hydraulischer Abgleich). */
  kostenUmfeld: number;
  /** Kosten Lüftungsanlage. */
  kostenLueftung: number;
  /** Kosten individueller Sanierungsfahrplan. */
  kostenIsfp: number;
  /** Kosten Planung, Baubegleitung, Fachplanung. */
  kostenPlanung: number;
  /** Gesamtkosten der Sanierung, netto (Basis für KfW-261-Kredit, § 35c). */
  kostenNetto: number;
}

export interface VarianteBErgebnis {
  /** Tilgungszuschuss KfW 261 (Effizienzhaus). */
  tz: number;
  /** Zuschuss KfW 458 (Heizungstausch), falls in Variante B kombiniert. */
  z458: number;
  /** Zuschuss Fachplanung & Baubegleitung. */
  bb: number;
  /** Steuerbonus § 35c, falls Privatperson selbstnutzend. */
  st: number;
  gesamt: number;
}

export interface StatusErgebnis {
  ok: boolean;
  txt: string;
}

export interface IsfpVergleich {
  mit: number;
  ohne: number;
  delta: number;
}

export type EmpfohleneVariante = 'A' | 'B' | 'C';

export interface SanierungsErgebnis {
  varianteA: number;
  varianteB: VarianteBErgebnis;
  varianteC: number;
  status: StatusErgebnis;
  isfpVergleich: IsfpVergleich;
  /** Variante mit dem höchsten Förderergebnis. */
  empfohleneVariante: EmpfohleneVariante;
  bestesFoerderErgebnis: number;
  /** bestesFoerderErgebnis ÷ kostenNetto, 0 wenn kostenNetto = 0. */
  foerderquote: number;
}

/** Eingaben der optionalen Wirtschaftlichkeitsbetrachtung (Amortisation). */
export interface WirtschaftlichkeitInput {
  /** Eigenanteil der Investition (i. d. R. kostenNetto − bestesFoerderErgebnis). */
  eigenanteil: number;
  /** Geschätzte jährliche Einsparung durch die Sanierung, in Euro. */
  jaehrlicheEinsparung: number;
  /** Erwartete jährliche Energiepreissteigerung, z. B. 0.03 für 3 %. */
  preissteigerung: number;
  /** Kalkulationszins / Kapitalkosten, z. B. 0.02 für 2 %. */
  kapitalzins: number;
}

/**
 * Vom Client übergebene Wirtschaftlichkeits-Eingaben, ohne eigenanteil — der
 * Eigenanteil ergibt sich erst aus dem Förderergebnis und wird serverseitig
 * in actions.ts aus kostenNetto − bestesFoerderErgebnis gebildet.
 */
export type WirtschaftlichkeitEingabe = Omit<WirtschaftlichkeitInput, 'eigenanteil'>;

export interface WirtschaftlichkeitErgebnis {
  /** Amortisationsdauer ohne Preissteigerung/Zins, in Jahren (Infinity bei jaehrlicheEinsparung = 0). */
  amortStatischJahre: number;
  /** Amortisationsdauer unter Berücksichtigung von Preissteigerung und Kapitalzins, in Jahren. */
  amortDynamischJahre: number;
}
