'use client';

import { Card } from '@/components/ui/Card';
import { Field, TextInput } from '@/components/ui/Field';
import { summeEinzelkosten, type FormState } from './formstate';

function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

export function KostenCard({ form, onChange }: { form: FormState; onChange: (partial: Partial<FormState>) => void }) {
  const summe = summeEinzelkosten(form);
  const netto = parseFloat(form.kostenNetto.replace(',', '.')) || 0;
  const differenz = Math.round(summe - netto);

  return (
    <Card eyebrow="Karte 4" title="Sanierungskosten">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Gebäudehülle (€)" hint="Fassade, Fenster, Dach, Keller.">
          <TextInput type="number" min={0} step={100} value={form.kostenHuelle} onChange={(e) => onChange({ kostenHuelle: e.target.value })} />
        </Field>
        <Field label="Heizungstausch (€)" hint="Basis für KfW 458.">
          <TextInput type="number" min={0} step={100} value={form.kostenHeizung} onChange={(e) => onChange({ kostenHeizung: e.target.value })} />
        </Field>
        <Field label="Umfeldmaßnahmen Heizung (€)" hint="z. B. Fußbodenheizung, hydraulischer Abgleich.">
          <TextInput type="number" min={0} step={100} value={form.kostenUmfeld} onChange={(e) => onChange({ kostenUmfeld: e.target.value })} />
        </Field>
        <Field label="Lüftungsanlage (€)">
          <TextInput type="number" min={0} step={100} value={form.kostenLueftung} onChange={(e) => onChange({ kostenLueftung: e.target.value })} />
        </Field>
        <Field label="Individueller Sanierungsfahrplan (€)">
          <TextInput type="number" min={0} step={50} value={form.kostenIsfp} onChange={(e) => onChange({ kostenIsfp: e.target.value })} />
        </Field>
        <Field label="Planung & Baubegleitung (€)">
          <TextInput type="number" min={0} step={100} value={form.kostenPlanung} onChange={(e) => onChange({ kostenPlanung: e.target.value })} />
        </Field>
        <Field label="Gesamtkosten netto (€)" hint="Basis für KfW-261-Kredit und § 35c.">
          <TextInput type="number" min={0} step={100} value={form.kostenNetto} onChange={(e) => onChange({ kostenNetto: e.target.value })} />
        </Field>
        <Field label="davon für § 35c ausgewiesen (€)" hint="Kosten, die separat für den Steuerbonus geltend gemacht werden.">
          <TextInput type="number" min={0} step={100} value={form.ausl35c} onChange={(e) => onChange({ ausl35c: e.target.value })} />
        </Field>
      </div>

      {netto > 0 && Math.abs(differenz) > 1 && (
        <p className="mt-3 text-[12.5px] text-warm">
          Summe der Einzelkosten ({formatEuro(summe)}) weicht {differenz > 0 ? 'um ' + formatEuro(differenz) + ' nach oben' : 'um ' + formatEuro(-differenz) + ' nach unten'} von den
          Gesamtkosten netto ab — zur Kontrolle.
        </p>
      )}
    </Card>
  );
}
