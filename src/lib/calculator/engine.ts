import 'server-only';

import type {
  EhStufe,
  IsfpVergleich,
  LiegenschaftInput,
  SanierungsErgebnis,
  StatusErgebnis,
  VarianteBErgebnis,
  WirtschaftlichkeitErgebnis,
  WirtschaftlichkeitInput,
} from './types';

/**
 * energetisiert. Tools — Sanierungsrechner WG
 * Reine Förder- und Wirtschaftlichkeitslogik (BEG EM, KfW 458, KfW 261,
 * § 35c EStG). 1:1-Portierung von foerderlogik.js nach TypeScript,
 * regressionsgetestet gegen die Excel-Referenz "Kundendokument Sanierung &
 * Förderung 2026 energetisiert" (siehe engine.test.ts, portiert aus
 * foerderlogik.test.js). Frei von DOM-Zugriffen; wird ausschließlich
 * serverseitig aufgerufen (app/rechner/actions.ts) — Sätze, Deckel und
 * Formeln verlassen den Server nie. Der 'server-only'-Import lässt jeden
 * Build hart fehlschlagen, der diese Datei versehentlich aus einer
 * Client-Komponente importiert.
 *
 * Rechtsstand: BEG-Reform 08.07.2026 (Haushaltsausschuss) / Inkrafttreten
 * 21.07.2026. Finale Förderrichtlinie noch nicht im Bundesanzeiger
 * veröffentlicht — bekannte Unsicherheiten siehe README.md.
 */

/**
 * Tilgungszuschüsse KfW 261 in % — Quelle: BMWE-Eckpunkte + Fachportale, Stand 08/2026.
 * NEU: EH 70 EE und EH 85 EE erhalten 0 % TZ (Ausgleich über Zinsverbilligung), Denkmal EE bleibt bei 5 %.
 */
const TZ: Record<EhStufe, { alt: number; neu: number }> = {
  'Effizienzhaus 40': { alt: 20, neu: 10 },
  'Effizienzhaus 55': { alt: 15, neu: 5 },
  'Effizienzhaus 70': { alt: 10, neu: 0 },
  'Effizienzhaus 85': { alt: 5, neu: 0 },
  'Effizienzhaus Denkmal': { alt: 5, neu: 5 },
};

export function staffel(we: number, erst: number, folge = 15000, ab7 = 8000): number {
  return erst * Math.min(we, 1) + folge * Math.min(Math.max(we - 1, 0), 5) + ab7 * Math.max(we - 6, 0);
}

/* ---- BEG EM: Gebäudehülle + Anlagentechnik in EINEM gemeinsamen Fördertopf (BAFA Nr. 5.1/5.2/5.4) ---- */
/* Wichtig: Hülle und Lüftung teilen sich EINE Höchstgrenze, keine zwei getrennten Töpfe. */

export function huelleUndAnlageCap(i: Pick<LiegenschaftInput, 'we' | 'isfp' | 'neu'>): number {
  return i.neu ? staffel(i.we, 30000) * (i.isfp ? 2 : 1) : (i.isfp ? 60000 : 30000) * i.we;
}

export function zuschussEffizienzmassnahmen(
  i: Pick<LiegenschaftInput, 'we' | 'isfp' | 'neu' | 'kostenHuelle' | 'kostenLueftung'>,
): number {
  const pool = i.kostenHuelle + i.kostenLueftung;
  const cap = huelleUndAnlageCap(i);
  const ff = Math.min(pool, cap);
  const grund = ff * 0.15;
  // iSFP-Bonus (5 %): ALT flach auf die volle Bemessungsgrundlage.
  // NEU (ab 21.07.2026): nur auf den Anteil OBERHALB der (WE-gestaffelten) 30.000-€-Schwelle (BAFA-Merkblatt 07/2026).
  if (!i.isfp) return grund;
  const schwelle = staffel(i.we, 30000);
  const isfpBonus = i.neu ? Math.max(ff - schwelle, 0) * 0.05 : ff * 0.05;
  return grund + isfpBonus;
}

export function zuschussIsfp(i: Pick<LiegenschaftInput, 'isfp' | 'we' | 'kostenIsfp'>): number {
  return i.isfp ? Math.min(i.kostenIsfp * 0.5, i.we <= 2 ? 650 : 850) : 0;
}

export function zuschussFachplanung(i: Pick<LiegenschaftInput, 'kostenPlanung'>): number {
  return Math.min(i.kostenPlanung * 0.5, 2500);
}

/* ---- KfW 458: Heizungstausch ---- */

export function cap458(i: Pick<LiegenschaftInput, 'we' | 'neu'>): number {
  return staffel(i.we, i.neu ? 28000 : 30000);
}

/** Einkommensbonus gestaffelt (NEU: 3 Stufen + Familienzuschlag; ALT: 1 Stufe). */
export function einkommensSatz(i: Pick<LiegenschaftInput, 'zve' | 'kinder' | 'neu'>): number {
  const kids = i.kinder || 0;
  const g1 = 30000 + kids * 10000;
  const g2 = 40000 + kids * 10000;
  const g3 = 50000 + kids * 10000;
  if (i.zve <= g1) return i.neu ? 0.4 : 0.3;
  if (i.zve <= g2) return 0.3;
  if (i.neu && i.zve <= g3) return 0.1;
  return 0;
}

export function geringverdiener(i: Pick<LiegenschaftInput, 'neu' | 'zve' | 'kinder'>): boolean {
  return i.neu && i.zve <= 30000 + (i.kinder || 0) * 10000;
}

export function satz458(
  i: Pick<LiegenschaftInput, 'antrag' | 'neu' | 'effizienz' | 'klima' | 'zve' | 'kinder'>,
): number {
  const selbst = i.antrag === 'Privatperson (selbstnutzend)';
  let s = 0.3;
  if (!i.neu && i.effizienz) s += 0.05; // Effizienzbonus: nur ALT, entfällt NEU ersatzlos
  if (selbst) {
    s += i.klima ? (i.neu ? 0.16 : 0.2) : 0; // Klimageschwindigkeit: neu 16 % (degressiv ab 02/2027)
    s += einkommensSatz(i);
  }
  // Deckel: NEU 70 %, für Geringverdiener (zvE ≤ 30 T€ + Familienzuschlag) 80 %. ALT: einheitlich 70 %.
  const deckel = i.neu && selbst && geringverdiener(i) ? 0.8 : 0.7;
  return Math.min(s, deckel);
}

export function zuschuss458(
  i: Pick<
    LiegenschaftInput,
    'kostenHeizung' | 'kostenUmfeld' | 'we' | 'neu' | 'antrag' | 'effizienz' | 'klima' | 'zve' | 'kinder'
  >,
): number {
  return Math.min(i.kostenHeizung + i.kostenUmfeld, cap458(i)) * satz458(i);
}

/* ---- Variante A: BEG EM gesamt ---- */

export function varianteA(i: LiegenschaftInput): number {
  return zuschussEffizienzmassnahmen(i) + zuschussIsfp(i) + zuschussFachplanung(i) + zuschuss458(i);
}

/* ---- Variante B: KfW 261 (+458 +§35c) ---- */

export function eeWirksam(i: Pick<LiegenschaftInput, 'neu' | 'eeklasse' | 'kombi458'>): boolean {
  return !i.neu && i.eeklasse && !i.kombi458;
}

export function maxKredit(i: Pick<LiegenschaftInput, 'neu' | 'eeklasse' | 'kombi458'>): number {
  return i.neu ? 150000 : 120000 + (eeWirksam(i) ? 30000 : 0);
}

export function tzSatz(
  i: Pick<LiegenschaftInput, 'ehstufe' | 'neu' | 'eeklasse' | 'kombi458' | 'wpb' | 'sersan' | 'nhklasse'>,
): number {
  const basis = TZ[i.ehstufe][i.neu ? 'neu' : 'alt'];
  const ee = eeWirksam(i) ? 5 : 0;
  const wpbOk = (['Effizienzhaus 40', 'Effizienzhaus 55', 'Effizienzhaus 70'] as EhStufe[]).includes(i.ehstufe);
  const ser4055 = (['Effizienzhaus 40', 'Effizienzhaus 55'] as EhStufe[]).includes(i.ehstufe);
  const wpb = i.wpb && wpbOk ? 10 : 0;
  const ser = i.sersan ? (ser4055 ? 15 : i.neu && i.ehstufe === 'Effizienzhaus 70' ? 5 : 0) : 0;
  // Kumulierungsgrenze WPB+SerSan: ALT gedeckelt auf 20 %-Punkte, NEU aufgehoben (max. ohnehin 25 %-Punkte)
  const wpbSerCap = i.neu ? 25 : 20;
  const nh = i.neu && i.nhklasse ? 5 : 0; // NH-Klasse: neu eigenständig +5 %-Punkte, additiv, nicht gedeckelt
  return (basis + ee + Math.min(wpb + ser, wpbSerCap) + nh) / 100;
}

export function kredit261(
  i: Pick<
    LiegenschaftInput,
    'kostenNetto' | 'kombi458' | 'kostenHeizung' | 'kostenUmfeld' | 'ausl35c' | 'we' | 'neu' | 'eeklasse'
  >,
): number {
  const basis = i.kostenNetto - (i.kombi458 ? i.kostenHeizung + i.kostenUmfeld : 0) - i.ausl35c;
  return Math.max(Math.min(basis, maxKredit(i) * i.we), 0);
}

export function varianteB(i: LiegenschaftInput): VarianteBErgebnis {
  const tz = kredit261(i) * tzSatz(i);
  const z458 = i.kombi458 ? zuschuss458(i) : 0;
  const bb = Math.min(i.kostenPlanung, i.we <= 2 ? 10000 : Math.min(4000 * i.we, 40000)) * 0.5;
  const st = i.antrag === 'Privatperson (selbstnutzend)' ? Math.min(i.ausl35c, 200000) * 0.2 : 0;
  return { tz, z458, bb, st, gesamt: tz + z458 + bb + st };
}

/* ---- Variante C: § 35c allein ---- */

export function varianteC(i: Pick<LiegenschaftInput, 'antrag' | 'kostenNetto'>): number {
  return i.antrag === 'Privatperson (selbstnutzend)' ? Math.min(i.kostenNetto, 200000) * 0.2 : 0;
}

/* ---- Statusprüfung (Ampel) ---- */

export function status(i: LiegenschaftInput): StatusErgebnis {
  if (i.kombi458 && i.eeklasse && !i.neu) {
    return {
      ok: false,
      txt: 'EE-Klasse entfällt: Bonus +5 % und 150-T€-Rahmen werden bei separater 458-Förderung nicht angesetzt.',
    };
  }
  if (i.wpb && (['Effizienzhaus 85', 'Effizienzhaus Denkmal'] as EhStufe[]).includes(i.ehstufe)) {
    return {
      ok: false,
      txt: 'WPB-Bonus entfällt: nur bei Sanierung auf EH 40, 55 oder 70 möglich – bei EH 85 und Denkmal nicht.',
    };
  }
  if (
    i.sersan &&
    !(['Effizienzhaus 40', 'Effizienzhaus 55'] as EhStufe[]).includes(i.ehstufe) &&
    !(i.neu && i.ehstufe === 'Effizienzhaus 70')
  ) {
    return { ok: false, txt: 'SerSan-Bonus entfällt: gilt für EH 40/55, neu zusätzlich für EH 70 EE.' };
  }
  if (!i.neu) {
    return {
      ok: false,
      txt: 'Rechtsstand ALT ist praktisch ausgelaufen: BAFA-Technische Projektbeschreibungen sind seit 20.07.2026 ungültig. Nur noch relevant für KfW-458-Vorhaben mit BzA vom 08.07.2026 oder früher (6 Monate gültig ab Ausstellung).',
    };
  }
  return {
    ok: true,
    txt: 'Alle gewählten Boni sind in dieser Konstellation ansetzbar. Hinweis: Antragstellung KfW 261 zu neuen Konditionen voraussichtlich erst ab Ende September 2026 möglich.',
  };
}

/* ---- iSFP-Vergleich ---- */

export function isfpVergleich(
  i: Pick<LiegenschaftInput, 'we' | 'neu' | 'kostenHuelle' | 'kostenLueftung' | 'kostenIsfp'>,
): IsfpVergleich {
  const mit = zuschussEffizienzmassnahmen({ ...i, isfp: true }) + zuschussIsfp({ ...i, isfp: true });
  const ohne = zuschussEffizienzmassnahmen({ ...i, isfp: false });
  return { mit, ohne, delta: mit - ohne };
}

/* ---- Wirtschaftlichkeit ---- */

export function amortStatisch(eigen: number, spar: number): number {
  return spar > 0 ? eigen / spar : Infinity;
}

export function amortDynamisch(eigen: number, spar: number, g: number, z: number): number {
  if (spar <= 0) return Infinity;
  const q = (1 + g) / (1 + z);
  if (Math.abs(q - 1) < 1e-9) return eigen / spar;
  const arg = 1 - (eigen * (1 - q)) / (spar * q);
  if (arg <= 0) return Infinity;
  return Math.log(arg) / Math.log(q);
}

export function berechneWirtschaftlichkeit(i: WirtschaftlichkeitInput): WirtschaftlichkeitErgebnis {
  return {
    amortStatischJahre: amortStatisch(i.eigenanteil, i.jaehrlicheEinsparung),
    amortDynamischJahre: amortDynamisch(i.eigenanteil, i.jaehrlicheEinsparung, i.preissteigerung, i.kapitalzins),
  };
}

/**
 * Einziger Einstiegspunkt für die Server Action: berechnet alle drei
 * Förder-Varianten, den Status-Hinweis und den iSFP-Vergleich für eine
 * Liegenschaft und ermittelt die Variante mit dem höchsten Förderergebnis.
 */
export function berechneSanierung(i: LiegenschaftInput): SanierungsErgebnis {
  const a = varianteA(i);
  const b = varianteB(i);
  const c = varianteC(i);

  const kandidaten: Array<{ variante: 'A' | 'B' | 'C'; betrag: number }> = [
    { variante: 'A', betrag: a },
    { variante: 'B', betrag: b.gesamt },
    { variante: 'C', betrag: c },
  ];
  const beste = kandidaten.reduce((max, cur) => (cur.betrag > max.betrag ? cur : max));

  return {
    varianteA: a,
    varianteB: b,
    varianteC: c,
    status: status(i),
    isfpVergleich: isfpVergleich(i),
    empfohleneVariante: beste.variante,
    bestesFoerderErgebnis: beste.betrag,
    foerderquote: i.kostenNetto > 0 ? beste.betrag / i.kostenNetto : 0,
  };
}
