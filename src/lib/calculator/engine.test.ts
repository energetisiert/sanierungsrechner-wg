import { describe, expect, it } from 'vitest';
import {
  einkommensSatz,
  satz458,
  staffel,
  status,
  tzSatz,
  varianteA,
  varianteB,
  varianteC,
  zuschussEffizienzmassnahmen,
} from './engine';
import type { LiegenschaftInput } from './types';

/**
 * Regressionstests, 1:1 portiert aus foerderlogik.test.js. Alle Werte sind
 * gegen die Excel-Referenz (Kundendokument Sanierung & Förderung 2026) und
 * die Rechercheergebnisse zur BEG-Reform (Stand 08/2026) geprüft. Bei
 * Rechtsstandsänderungen: engine.ts UND diese Suite synchron aktualisieren.
 */

function closeTo(actual: number, expected: number, tolerance = 0.5) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

const base: LiegenschaftInput = {
  neu: true,
  we: 1,
  antrag: 'Privatperson (selbstnutzend)',
  isfp: true,
  klima: true,
  effizienz: false,
  zve: 55000,
  kinder: 0,
  ehstufe: 'Effizienzhaus 55',
  wpb: true,
  sersan: false,
  eeklasse: false,
  nhklasse: false,
  kombi458: true,
  ausl35c: 0,
  kostenHuelle: 129330,
  kostenHeizung: 37000,
  kostenUmfeld: 27024,
  kostenLueftung: 6500,
  kostenIsfp: 1650,
  kostenPlanung: 11000,
  kostenNetto: 242986,
};

describe('Grundszenario (Referenz Kundendokument)', () => {
  it('Variante A (BEG EM)', () => closeTo(varianteA(base), 26530, 5));
  it('Variante B (KfW 261)', () => closeTo(varianteB(base).gesamt, 40380, 5));
  it('Variante C (§35c)', () => closeTo(varianteC(base), 40000, 1));
});

describe('Einkommensstaffel + Familienzuschlag', () => {
  it('zvE 25k, 0 Kinder -> 40%', () => closeTo(einkommensSatz({ zve: 25000, kinder: 0, neu: true }), 0.4, 0.001));
  it('zvE 35k -> 30%', () => closeTo(einkommensSatz({ zve: 35000, kinder: 0, neu: true }), 0.3, 0.001));
  it('zvE 45k -> 10%', () => closeTo(einkommensSatz({ zve: 45000, kinder: 0, neu: true }), 0.1, 0.001));
  it('zvE 45k, 2 Kinder -> 40% (Grenze +20k)', () =>
    closeTo(einkommensSatz({ zve: 45000, kinder: 2, neu: true }), 0.4, 0.001));
  it('zvE 60k -> 0%', () => closeTo(einkommensSatz({ zve: 60000, kinder: 0, neu: true }), 0, 0.001));
});

describe('70/80-%-Deckel KfW 458', () => {
  it('Geringverdiener (25k) -> Deckel 80%', () =>
    closeTo(satz458({ ...base, zve: 25000, kinder: 0 }), 0.8, 0.001));
  it('Normalfall (55k) -> Deckel 70% wirkt nicht (Satz < 70%)', () => closeTo(satz458(base), 0.46, 0.001));
});

describe('KfW 261: Denkmal-Fix (neu=5%, nicht 0%)', () => {
  const dk: LiegenschaftInput = { ...base, ehstufe: 'Effizienzhaus Denkmal' };
  it('TZ-Satz Denkmal+WPB (WPB muss entfallen)', () => closeTo(tzSatz(dk), 0.05, 0.001));
  it('Status meldet WPB-Wegfall', () => expect(status(dk).ok).toBe(false));
});

describe('WPB+SerSan Kumulierungsgrenze (neu 25%, nicht 20%)', () => {
  const wpbSer: LiegenschaftInput = { ...base, wpb: true, sersan: true, ehstufe: 'Effizienzhaus 55' };
  it('TZ-Satz EH55+WPB+SerSan (5+10+15=30%, unged.)', () => closeTo(tzSatz(wpbSer), 0.3, 0.001));
});

describe('NH-Klasse additiv', () => {
  const nh: LiegenschaftInput = { ...base, nhklasse: true };
  it('TZ-Satz EH55+WPB+NH (5+10+5=20%)', () => closeTo(tzSatz(nh), 0.2, 0.001));
});

describe('Kombinierter Fördertopf Hülle+Anlage (BAFA Nr. 5.1/5.2/5.4)', () => {
  it('Gedeckelter Pool NEU (60k Cap, iSFP nur >30k)', () => {
    const pool = zuschussEffizienzmassnahmen({ kostenHuelle: 100000, kostenLueftung: 6500, we: 1, isfp: true, neu: true });
    closeTo(pool, 10500, 1);
  });
});

describe('iSFP-Schwelle skaliert mit WE-Staffel (MFH)', () => {
  it('Schwelle bei 3 WE = 60.000 €', () => closeTo(staffel(3, 30000), 60000, 1));
});

describe('ALT-Rechtsstand als Kontrolle', () => {
  const alt: LiegenschaftInput = { ...base, neu: false, effizienz: true };
  it('Variante A ALT (Effizienzbonus 5% gilt noch)', () => closeTo(varianteA(alt), 31650, 5));
  it('458-Satz ALT (30+5+20=55%)', () => closeTo(satz458(alt), 0.55, 0.001));
});
