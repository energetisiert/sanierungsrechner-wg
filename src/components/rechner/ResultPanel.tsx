'use client';

import type { ReactNode } from 'react';
import type { SanierungsErgebnis, WirtschaftlichkeitErgebnis } from '@/lib/calculator/types';

function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

function formatJahre(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Jahre';
}

const VARIANTEN_LABEL = {
  A: 'Variante A — BEG Einzelmaßnahmen',
  B: 'Variante B — KfW 261 Effizienzhaus',
  C: 'Variante C — Steuerbonus § 35c allein',
} as const;

function VarianteZeile({
  label,
  betrag,
  empfohlen,
}: {
  label: string;
  betrag: number;
  empfohlen: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 ${
        empfohlen ? 'bg-mint/15 ring-1 ring-mint/50' : ''
      }`}
    >
      <div>
        <p className="text-[13px] font-semibold text-dark-body">{label}</p>
        {empfohlen && <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-mint">Höchste Förderung</p>}
      </div>
      <p className="tabular-nums text-[16px] font-bold text-white">{formatEuro(betrag)}</p>
    </div>
  );
}

export function ResultPanel({
  ergebnis,
  wirtschaftlichkeit,
  blocked,
  isPending,
  onReset,
  extra,
}: {
  ergebnis: SanierungsErgebnis | null;
  wirtschaftlichkeit: WirtschaftlichkeitErgebnis | null;
  blocked: boolean;
  isPending: boolean;
  onReset: () => void;
  /** Zusatz-Aktion unter dem PDF-Button (z. B. "Gebäude speichern"). */
  extra?: ReactNode;
}) {
  return (
    <div className="print-break-avoid rounded-[24px] bg-dark p-5 text-dark-body sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-disp text-[12px] font-bold uppercase tracking-[0.14em] text-dark-label">Förderergebnis</p>
        {isPending && <span className="text-[11px] text-dark-label">berechne …</span>}
      </div>

      {blocked && (
        <p className="rounded-xl bg-red/15 p-3 text-[13px] text-white">
          Die Berechnung konnte gerade nicht durchgeführt werden. Bitte Seite neu laden und erneut versuchen.
        </p>
      )}

      {!blocked && !ergebnis && <p className="text-[13.5px] text-dark-label">Angaben eintragen — die Berechnung läuft automatisch.</p>}

      {!blocked && ergebnis && (
        <>
          <div className="mb-5 space-y-2">
            <VarianteZeile label={VARIANTEN_LABEL.A} betrag={ergebnis.varianteA} empfohlen={ergebnis.empfohleneVariante === 'A'} />
            <VarianteZeile label={VARIANTEN_LABEL.B} betrag={ergebnis.varianteB.gesamt} empfohlen={ergebnis.empfohleneVariante === 'B'} />
            <VarianteZeile label={VARIANTEN_LABEL.C} betrag={ergebnis.varianteC} empfohlen={ergebnis.empfohleneVariante === 'C'} />
          </div>

          <div className="mb-5 rounded-xl bg-white/[0.06] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-dark-label">Beste Variante</p>
            <p className="mt-1 tabular-nums text-[26px] font-extrabold text-white">{formatEuro(ergebnis.bestesFoerderErgebnis)}</p>
            <p className="mt-1 text-[12.5px] text-dark-label">
              entspricht ca.{' '}
              {(ergebnis.foerderquote * 100).toLocaleString('de-DE', { maximumFractionDigits: 0 })} % der Gesamtkosten netto
            </p>
          </div>

          <div className={`mb-5 rounded-xl p-3.5 text-[12.5px] leading-[1.5] ${ergebnis.status.ok ? 'bg-mint/15 text-white' : 'bg-warm/15 text-white'}`}>
            {ergebnis.status.txt}
          </div>

          {ergebnis.isfpVergleich.delta > 1 && (
            <p className="mb-5 text-[12.5px] text-dark-label">
              iSFP-Bonus: <strong className="text-white">+{formatEuro(ergebnis.isfpVergleich.delta)}</strong> gegenüber ohne
              Sanierungsfahrplan.
            </p>
          )}

          {wirtschaftlichkeit && Number.isFinite(wirtschaftlichkeit.amortStatischJahre) && (
            <div className="mb-5 border-t border-white/10 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-dark-label">Amortisation Eigenanteil</p>
              <div className="mt-2 flex justify-between text-[13px]">
                <span>statisch</span>
                <span className="tabular-nums font-semibold text-white">{formatJahre(wirtschaftlichkeit.amortStatischJahre)}</span>
              </div>
              <div className="mt-1 flex justify-between text-[13px]">
                <span>dynamisch (mit Preissteigerung/Zins)</span>
                <span className="tabular-nums font-semibold text-white">{formatJahre(wirtschaftlichkeit.amortDynamischJahre)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="mb-2 w-full rounded-full bg-white/10 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-white/20"
          >
            Als PDF drucken
          </button>
          {extra}
        </>
      )}

      <button type="button" onClick={onReset} className="w-full rounded-full px-4 py-2 text-[12.5px] font-semibold text-dark-label hover:text-white">
        Eingaben zurücksetzen
      </button>
    </div>
  );
}
