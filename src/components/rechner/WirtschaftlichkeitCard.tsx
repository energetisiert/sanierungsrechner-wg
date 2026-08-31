'use client';

import { Card } from '@/components/ui/Card';
import { Field, TextInput } from '@/components/ui/Field';
import type { FormState } from './formstate';

export function WirtschaftlichkeitCard({ form, onChange }: { form: FormState; onChange: (partial: Partial<FormState>) => void }) {
  return (
    <Card eyebrow="Karte 5 · optional" title="Wirtschaftlichkeit">
      <p className="mb-4 text-[13px] text-muted2">
        Schätzt die Amortisationsdauer des Eigenanteils (Gesamtkosten abzüglich der besten Förderung) über die erwartete jährliche
        Einsparung.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Jährliche Einsparung (€)" hint="Energiekosten-Ersparnis durch die Sanierung.">
          <TextInput
            type="number"
            min={0}
            step={50}
            value={form.jaehrlicheEinsparung}
            onChange={(e) => onChange({ jaehrlicheEinsparung: e.target.value })}
          />
        </Field>
        <Field label="Energiepreissteigerung p. a. (%)">
          <TextInput type="number" min={0} step={0.5} value={form.preissteigerung} onChange={(e) => onChange({ preissteigerung: e.target.value })} />
        </Field>
        <Field label="Kalkulationszins p. a. (%)">
          <TextInput type="number" min={0} step={0.5} value={form.kapitalzins} onChange={(e) => onChange({ kapitalzins: e.target.value })} />
        </Field>
      </div>
    </Card>
  );
}
