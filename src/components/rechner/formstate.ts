import type { Antragstellertyp, EhStufe, LiegenschaftInput, WirtschaftlichkeitEingabe } from '@/lib/calculator/types';

/**
 * Formular-State mit Zahlenfeldern als String, damit Eingaben (auch leere
 * oder unvollständige) verlustfrei im Input stehen bleiben. Umwandlung nach
 * LiegenschaftInput erst beim Aufruf der Server Action (toInput).
 */
export interface FormState {
  neu: boolean;
  we: string;
  antrag: Antragstellertyp;
  isfp: boolean;
  klima: boolean;
  effizienz: boolean;
  zve: string;
  kinder: string;
  /** ISO-Datum; leer = heutiges Datum (serverseitig). */
  antragsdatum: string;
  ehstufe: EhStufe;
  wpb: boolean;
  sersan: boolean;
  eeklasse: boolean;
  nhklasse: boolean;
  kombi458: boolean;
  ausl35c: string;
  kostenHuelle: string;
  kostenHeizung: string;
  kostenUmfeld: string;
  kostenLueftung: string;
  kostenIsfp: string;
  kostenPlanung: string;
  kostenNetto: string;
  jaehrlicheEinsparung: string;
  /** Prozent, z. B. "3" für 3 % */
  preissteigerung: string;
  /** Prozent, z. B. "2" für 2 % */
  kapitalzins: string;
}

export const STANDARD_FORM: FormState = {
  neu: true,
  we: '1',
  antrag: 'Privatperson (selbstnutzend)',
  isfp: true,
  klima: true,
  effizienz: false,
  zve: '',
  kinder: '0',
  antragsdatum: '',
  ehstufe: 'Effizienzhaus 55',
  wpb: false,
  sersan: false,
  eeklasse: false,
  nhklasse: false,
  kombi458: true,
  ausl35c: '0',
  kostenHuelle: '',
  kostenHeizung: '',
  kostenUmfeld: '',
  kostenLueftung: '',
  kostenIsfp: '',
  kostenPlanung: '',
  kostenNetto: '',
  jaehrlicheEinsparung: '',
  preissteigerung: '3',
  kapitalzins: '2',
};

function num(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function toInput(f: FormState): LiegenschaftInput {
  return {
    neu: f.neu,
    we: Math.max(1, Math.round(num(f.we)) || 1),
    antrag: f.antrag,
    isfp: f.isfp,
    klima: f.klima,
    effizienz: f.effizienz,
    zve: num(f.zve),
    kinder: Math.max(0, Math.round(num(f.kinder))),
    antragsdatum: /^\d{4}-\d{2}-\d{2}$/.test(f.antragsdatum) ? f.antragsdatum : undefined,
    ehstufe: f.ehstufe,
    wpb: f.wpb,
    sersan: f.sersan,
    eeklasse: f.eeklasse,
    nhklasse: f.nhklasse,
    kombi458: f.kombi458,
    ausl35c: num(f.ausl35c),
    kostenHuelle: num(f.kostenHuelle),
    kostenHeizung: num(f.kostenHeizung),
    kostenUmfeld: num(f.kostenUmfeld),
    kostenLueftung: num(f.kostenLueftung),
    kostenIsfp: num(f.kostenIsfp),
    kostenPlanung: num(f.kostenPlanung),
    kostenNetto: num(f.kostenNetto),
  };
}

export function toWirtschaftlichkeitEingabe(f: FormState): WirtschaftlichkeitEingabe {
  return {
    jaehrlicheEinsparung: num(f.jaehrlicheEinsparung),
    preissteigerung: num(f.preissteigerung) / 100,
    kapitalzins: num(f.kapitalzins) / 100,
  };
}

/** Rundungsfreie Gesamtsumme aller Kostenfelder — für die Plausibilitätsanzeige „Summe Einzelkosten vs. kostenNetto“. */
export function summeEinzelkosten(f: FormState): number {
  return (
    num(f.kostenHuelle) +
    num(f.kostenHeizung) +
    num(f.kostenUmfeld) +
    num(f.kostenLueftung) +
    num(f.kostenIsfp) +
    num(f.kostenPlanung)
  );
}
