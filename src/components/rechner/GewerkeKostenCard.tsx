'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { GEWERKE, type Kostenziel } from '@/lib/calculator/gewerke';
import type { FormState } from './formstate';

/** Anzeige-Label je Kostenfeld, in derselben Reihenfolge wie in KostenCard. */
const ZIEL_LABEL: Record<Exclude<Kostenziel, 'informativ'>, string> = {
  kostenHuelle: 'Gebäudehülle',
  kostenHeizung: 'Heizung',
  kostenUmfeld: 'Umfeldmaßnahmen',
  kostenLueftung: 'Lüftung',
  kostenIsfp: 'Sanierungsfahrplan',
  kostenPlanung: 'Planung & Baubegleitung',
};

const ZIEL_FELD: Record<Exclude<Kostenziel, 'informativ'>, keyof FormState> = {
  kostenHuelle: 'kostenHuelle',
  kostenHeizung: 'kostenHeizung',
  kostenUmfeld: 'kostenUmfeld',
  kostenLueftung: 'kostenLueftung',
  kostenIsfp: 'kostenIsfp',
  kostenPlanung: 'kostenPlanung',
};

function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

export function GewerkeKostenCard({ onChange }: { onChange: (partial: Partial<FormState>) => void }) {
  const [offen, setOffen] = useState(false);
  const [mengen, setMengen] = useState<Record<string, string>>({});

  const summen = useMemo(() => {
    const ziel: Record<string, number> = {};
    for (const kategorie of GEWERKE) {
      kategorie.positionen.forEach((pos, pIdx) => {
        const key = `${kategorie.titel}-${pIdx}`;
        const menge = parseFloat((mengen[key] ?? '').replace(',', '.'));
        if (!Number.isFinite(menge) || menge <= 0) return;
        ziel[pos.kostenziel] = (ziel[pos.kostenziel] ?? 0) + menge * pos.mittelwert;
      });
    }
    return ziel;
  }, [mengen]);

  const gesamt = Object.entries(summen).reduce((sum, [ziel, betrag]) => (ziel === 'informativ' ? sum : sum + betrag), 0);

  function uebernehmen(ziel: Exclude<Kostenziel, 'informativ'>) {
    const betrag = summen[ziel] ?? 0;
    onChange({ [ZIEL_FELD[ziel]]: String(Math.round(betrag)) });
  }

  function alleUebernehmen() {
    const partial: Record<string, string> = {};
    (Object.keys(ZIEL_FELD) as Array<Exclude<Kostenziel, 'informativ'>>).forEach((ziel) => {
      if (summen[ziel]) partial[ZIEL_FELD[ziel]] = String(Math.round(summen[ziel]));
    });
    onChange(partial as Partial<FormState>);
  }

  return (
    <Card eyebrow="Karte 3 · optional" title="Kostenschätzung nach Gewerken">
      <p className="text-[13px] text-muted2">
        Marktübliche Mittelwertpreise als Hilfestellung — Mengen eintragen, Ergebnis unten je Kostenfeld übernehmen. Ersetzt keine
        Angebote, dient nur der ersten Grobschätzung.
      </p>
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        className="mt-3 text-[13px] font-semibold text-ac hover:underline"
      >
        {offen ? 'Gewerke-Liste einklappen ↑' : 'Gewerke-Liste öffnen ↓'}
      </button>

      {offen && (
        <div className="mt-4 space-y-6">
          {GEWERKE.map((kategorie) => (
            <div key={kategorie.titel}>
              <h4 className="mb-2 text-[13.5px] font-bold text-strong">{kategorie.titel}</h4>
              <div className="space-y-2">
                {kategorie.positionen.map((pos, pIdx) => {
                  const key = `${kategorie.titel}-${pIdx}`;
                  return (
                    <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-tint px-3 py-2 sm:grid-cols-[1fr_110px_90px]">
                      <div>
                        <p className="text-[13.5px] font-semibold text-strong">
                          {pos.name}
                          {pos.alternative && <span className="ml-1.5 text-[11px] font-normal text-muted2">(Alternative)</span>}
                        </p>
                        <p className="text-[12px] text-muted2">
                          {pos.hinweis} · ⌀ {formatEuro(pos.mittelwert)}/{pos.einheit} · Spanne {pos.spanne} €
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        placeholder={`Menge (${pos.einheit})`}
                        value={mengen[key] ?? ''}
                        onChange={(e) => setMengen((m) => ({ ...m, [key]: e.target.value }))}
                        className="col-span-2 w-full rounded-lg border border-strong/40 bg-white px-2.5 py-1.5 text-[13.5px] outline-none focus:border-ac sm:col-span-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-ac/25 bg-[#f1f6f3] p-4">
            <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.1em] text-ac">Zwischensumme je Kostenfeld</p>
            <div className="space-y-1.5">
              {(Object.keys(ZIEL_LABEL) as Array<Exclude<Kostenziel, 'informativ'>>).map((ziel) => (
                <div key={ziel} className="flex items-center justify-between gap-3 text-[13.5px]">
                  <span className="text-strong">{ZIEL_LABEL[ziel]}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-muted">{formatEuro(summen[ziel] ?? 0)}</span>
                    <button
                      type="button"
                      onClick={() => uebernehmen(ziel)}
                      disabled={!summen[ziel]}
                      className="rounded-full border border-ac/40 px-2.5 py-1 text-[11.5px] font-semibold text-ac transition-colors hover:bg-ac hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      übernehmen
                    </button>
                  </span>
                </div>
              ))}
              {summen.informativ ? (
                <div className="flex items-center justify-between gap-3 text-[13.5px] text-muted2">
                  <span>Photovoltaik u. ä. (informativ, keine BEG-Förderung)</span>
                  <span className="tabular-nums">{formatEuro(summen.informativ)}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-ac/20 pt-3">
              <span className="text-[13.5px] font-bold text-strong">Summe förderfähige Gewerke</span>
              <span className="tabular-nums text-[14.5px] font-bold text-doc">{formatEuro(gesamt)}</span>
            </div>
            <button
              type="button"
              onClick={alleUebernehmen}
              className="mt-3 w-full rounded-full bg-doc px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-dark"
            >
              Alle Zwischensummen in Kostenfelder übernehmen
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
