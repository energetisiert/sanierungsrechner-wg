import type { SanierungsErgebnis, WirtschaftlichkeitErgebnis } from '@/lib/calculator/types';
import type { FormState } from './formstate';

function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

/**
 * Druckausgabe, nur im Druck sichtbar (hidden print:block) — die interaktive
 * Oberfläche wird über .no-print in globals.css ausgeblendet. Gleiches
 * Muster wie im Heizlast-/Förder-/CO2-Rechner.
 */
export function PrintReport({
  form,
  ergebnis,
  wirtschaftlichkeit,
}: {
  form: FormState;
  ergebnis: SanierungsErgebnis;
  wirtschaftlichkeit: WirtschaftlichkeitErgebnis;
}) {
  return (
    <div className="hidden print:block">
      <h2 className="font-disp text-[20px] font-bold text-doc">Sanierungsrechner WG — Ergebnis</h2>
      <p className="mt-1 text-[12px] text-muted">
        Rechtsstand {form.neu ? 'BEG-Reform ab 21.07.2026' : 'ALT'} · {form.we} Wohneinheit{Number(form.we) === 1 ? '' : 'en'} ·{' '}
        {form.antrag}
      </p>

      <table className="mt-4 w-full border-collapse text-[12.5px]">
        <tbody>
          <tr className="border-b border-black/10">
            <td className="py-1.5 text-strong">Variante A — BEG Einzelmaßnahmen</td>
            <td className="py-1.5 text-right tabular-nums">{formatEuro(ergebnis.varianteA)}</td>
          </tr>
          <tr className="border-b border-black/10">
            <td className="py-1.5 text-strong">Variante B — KfW 261 Effizienzhaus</td>
            <td className="py-1.5 text-right tabular-nums">{formatEuro(ergebnis.varianteB.gesamt)}</td>
          </tr>
          <tr className="border-b border-black/10">
            <td className="py-1.5 text-strong">Variante C — Steuerbonus § 35c</td>
            <td className="py-1.5 text-right tabular-nums">{formatEuro(ergebnis.varianteC)}</td>
          </tr>
          <tr>
            <td className="py-2 font-bold text-doc">Beste Variante ({ergebnis.empfohleneVariante})</td>
            <td className="py-2 text-right tabular-nums font-bold text-doc">{formatEuro(ergebnis.bestesFoerderErgebnis)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-[12px] text-muted">{ergebnis.status.txt}</p>

      {Number.isFinite(wirtschaftlichkeit.amortStatischJahre) && (
        <p className="mt-2 text-[12px] text-muted">
          Amortisation Eigenanteil: {wirtschaftlichkeit.amortStatischJahre.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Jahre
          statisch, {wirtschaftlichkeit.amortDynamischJahre.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Jahre dynamisch.
        </p>
      )}
    </div>
  );
}
