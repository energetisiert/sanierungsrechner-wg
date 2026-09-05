import type { EhStufe } from '@/lib/calculator/types';
import type { FormState } from '@/components/rechner/formstate';
import { STAMMDATEN_SCHEMA_VERSION, type GebaeudeStammdaten } from './stammdaten';

/** Sanierungsrechner-Adapter: FormState <-> kanonische Stammdaten (Eigentümer, Sanierungsprofil). */
const EH_ZU_KURZ: Record<EhStufe, string> = {
  'Effizienzhaus 40': 'eh40', 'Effizienzhaus 55': 'eh55', 'Effizienzhaus 70': 'eh70', 'Effizienzhaus 85': 'eh85', 'Effizienzhaus Denkmal': 'ehDenkmal',
};
const KURZ_ZU_EH: Record<string, EhStufe> = Object.fromEntries(Object.entries(EH_ZU_KURZ).map(([k, v]) => [v, k as EhStufe]));

function zahl(v: string): number | undefined {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function inStammdaten(f: FormState): Partial<GebaeudeStammdaten> {
  const selbst = f.antrag === 'Privatperson (selbstnutzend)';
  return {
    schema_version: STAMMDATEN_SCHEMA_VERSION,
    gebaeudeart: 'wg',
    wohneinheiten: zahl(f.we),
    eigentuemer: {
      zve: selbst ? zahl(f.zve) : undefined,
      kinder: selbst ? Math.max(0, Math.round(zahl(f.kinder) ?? 0)) : undefined,
      antragstellertyp: selbst ? 'privat' : 'unternehmen',
      nutzung: selbst ? 'selbstnutzend' : 'vermietet',
    },
    sanierung: { isfp: f.isfp, ehStufe: EH_ZU_KURZ[f.ehstufe], eeklasse: f.eeklasse, nhklasse: f.nhklasse, wpb: f.wpb, sersan: f.sersan },
  };
}

export function ausStammdaten(s: Partial<GebaeudeStammdaten>): Partial<FormState> {
  const p: Partial<FormState> = {};
  if (typeof s.wohneinheiten === 'number' && s.wohneinheiten > 0) p.we = String(Math.round(s.wohneinheiten));
  if (typeof s.eigentuemer?.zve === 'number') p.zve = String(s.eigentuemer.zve);
  if (typeof s.eigentuemer?.kinder === 'number') p.kinder = String(s.eigentuemer.kinder);
  if (s.eigentuemer?.antragstellertyp || s.eigentuemer?.nutzung) {
    const selbst = s.eigentuemer.antragstellertyp === 'privat' && s.eigentuemer.nutzung !== 'vermietet';
    p.antrag = selbst ? 'Privatperson (selbstnutzend)' : 'Vermietend / Unternehmen / WEG';
  }
  const san = s.sanierung;
  if (san) {
    if (typeof san.isfp === 'boolean') p.isfp = san.isfp;
    if (san.ehStufe && KURZ_ZU_EH[san.ehStufe]) p.ehstufe = KURZ_ZU_EH[san.ehStufe];
    if (typeof san.eeklasse === 'boolean') p.eeklasse = san.eeklasse;
    if (typeof san.nhklasse === 'boolean') p.nhklasse = san.nhklasse;
    if (typeof san.wpb === 'boolean') p.wpb = san.wpb;
    if (typeof san.sersan === 'boolean') p.sersan = san.sersan;
  }
  return p;
}
