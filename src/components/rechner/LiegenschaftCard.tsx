'use client';

import { Card } from '@/components/ui/Card';
import { Field, TextInput } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import type { Antragstellertyp } from '@/lib/calculator/types';
import type { FormState } from './formstate';

export function LiegenschaftCard({ form, onChange }: { form: FormState; onChange: (partial: Partial<FormState>) => void }) {
  const selbstnutzend = form.antrag === 'Privatperson (selbstnutzend)';

  return (
    <Card eyebrow="Karte 1" title="Liegenschaft & Antragsteller">
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">Rechtsstand</span>
          <Segmented
            aria-label="Rechtsstand"
            value={form.neu ? 'neu' : 'alt'}
            onChange={(v) => onChange({ neu: v === 'neu' })}
            options={[
              { value: 'neu', label: 'BEG-Reform ab 21.07.2026' },
              { value: 'alt', label: 'Rechtsstand ALT' },
            ]}
          />
          {!form.neu && (
            <p className="mt-1 text-[12.5px] text-warm">
              ALT ist praktisch ausgelaufen — nur noch relevant für laufende KfW-458-Vorhaben mit BzA vom 08.07.2026 oder früher.
            </p>
          )}
        </div>

        <Field label="Anzahl Wohneinheiten" hint="1 = Einfamilienhaus. Bestimmt die Deckel-Staffelung aller Höchstbeträge.">
          <TextInput type="number" min={1} step={1} value={form.we} onChange={(e) => onChange({ we: e.target.value })} />
        </Field>

        <div>
          <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">Antragsteller</span>
          <Segmented
            aria-label="Antragsteller"
            value={form.antrag}
            onChange={(antrag: Antragstellertyp) => onChange({ antrag })}
            options={[
              { value: 'Privatperson (selbstnutzend)', label: 'Privatperson (selbstnutzend)' },
              { value: 'Vermietend / Unternehmen / WEG', label: 'Vermietend / Unternehmen / WEG' },
            ]}
          />
          <p className="mt-1 text-[12.5px] text-muted2">
            Klimageschwindigkeits-, Einkommens- und Steuerbonus (§ 35c) gelten nur für selbstnutzende Privatpersonen.
          </p>
        </div>

        {selbstnutzend && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Zu versteuerndes Haushaltseinkommen (€)" hint="Laut Steuerbescheid, für Einkommensbonus KfW 458.">
              <TextInput type="number" min={0} step={1000} value={form.zve} onChange={(e) => onChange({ zve: e.target.value })} />
            </Field>
            <Field label="Kinder im Haushalt (< 18 Jahre)" hint="Ab einem Kind verschieben sich alle Einkommensgrenzen einmalig pauschal um 10.000 € (nicht je Kind).">
              <TextInput type="number" min={0} step={1} value={form.kinder} onChange={(e) => onChange({ kinder: e.target.value })} />
            </Field>
          </div>
        )}
      </div>
    </Card>
  );
}
