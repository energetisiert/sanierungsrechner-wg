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
  geringverdiener,
  zuschussFachplanung,
  huelleUndAnlageCap,
  kgbSatz,
  cap458,
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
  it('zvE 45k, 2 Kinder -> 30% (Zuschlag pauschal +10k, nicht je Kind; RL BEG EM Nr. 8.4.5)', () =>
    closeTo(einkommensSatz({ zve: 45000, kinder: 2, neu: true }), 0.3, 0.001));
  it('zvE 39k, 1 Kind -> 40%', () => closeTo(einkommensSatz({ zve: 39000, kinder: 1, neu: true }), 0.4, 0.001));
  it('zvE 39k, 3 Kinder -> 40% (gleich wie 1 Kind)', () => closeTo(einkommensSatz({ zve: 39000, kinder: 3, neu: true }), 0.4, 0.001));
  it('ALT: kein Familienzuschlag, 30% bis 40k', () => {
    closeTo(einkommensSatz({ zve: 40000, kinder: 2, neu: false }), 0.3, 0.001);
    closeTo(einkommensSatz({ zve: 41000, kinder: 2, neu: false }), 0, 0.001);
  });
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

describe('Primärquellen-Korrekturen 05.09.2026 (RL BEG EM v. 17.07.2026)', () => {
  it('Geringverdiener-Deckel 80 %: 35k mit 1 Kind ja, mit 3 Kindern ebenfalls nur +10k', () => {
    expect(geringverdiener({ neu: true, zve: 35000, kinder: 1 })).toBe(true);
    expect(geringverdiener({ neu: true, zve: 45000, kinder: 3 })).toBe(false);
  });

  it('Fachplanung/Baubegleitung: 50 % auf 5.000 € (EFH/ZFH) bzw. 2.000 €/WE, max. 20.000 € (Nr. 8.3.1 b)', () => {
    closeTo(zuschussFachplanung({ kostenPlanung: 11000, we: 1 }), 2500, 0.01);
    closeTo(zuschussFachplanung({ kostenPlanung: 11000, we: 4 }), 4000, 0.01);
    closeTo(zuschussFachplanung({ kostenPlanung: 30000, we: 12 }), 10000, 0.01);
    closeTo(zuschussFachplanung({ kostenPlanung: 3000, we: 1 }), 1500, 0.01);
  });

  it('iSFP-Höchstgrenze ab 7. WE 15.000 € statt 16.000 € (Nr. 8.3.1 a)', () => {
    expect(huelleUndAnlageCap({ we: 7, isfp: true, neu: true })).toBe(60000 + 5 * 30000 + 15000);
    expect(huelleUndAnlageCap({ we: 7, isfp: false, neu: true })).toBe(30000 + 5 * 15000 + 8000);
  });

  it('Geschwindigkeitsbonus degressiv nach Antragsdatum (Nr. 8.4.4)', () => {
    expect(kgbSatz({ neu: true, antragsdatum: '2026-09-05' })).toBe(0.16);
    expect(kgbSatz({ neu: true, antragsdatum: '2027-02-01' })).toBe(0.12);
    expect(kgbSatz({ neu: true, antragsdatum: '2027-08-01' })).toBe(0.08);
    expect(kgbSatz({ neu: true, antragsdatum: '2028-02-01' })).toBe(0.04);
    expect(kgbSatz({ neu: true, antragsdatum: '2028-08-01' })).toBe(0);
    expect(kgbSatz({ neu: false, antragsdatum: '2028-08-01' })).toBe(0.2);
  });

  it('Höchstgrenze 1. WE degressiv 28.000 → 22.000 € (Nr. 8.3.1 a)', () => {
    expect(cap458({ we: 1, neu: true, antragsdatum: '2026-09-05' })).toBe(28000);
    expect(cap458({ we: 1, neu: true, antragsdatum: '2027-02-01' })).toBe(27250);
    expect(cap458({ we: 3, neu: true, antragsdatum: '2030-08-01' })).toBe(22000 + 2 * 15000);
    expect(cap458({ we: 1, neu: false, antragsdatum: '2030-08-01' })).toBe(30000);
  });

  it('satz458 mit Antragsdatum 03/2027: 30 + 12 + 10 = 52 %', () => {
    closeTo(satz458({ ...base, zve: 45000, antragsdatum: '2027-03-01' }), 0.52, 0.001);
  });
});
