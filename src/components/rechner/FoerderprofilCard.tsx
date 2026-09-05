'use client';

import { Card } from '@/components/ui/Card';
import { Checkbox, Field, Select, TextInput } from '@/components/ui/Field';
import type { EhStufe } from '@/lib/calculator/types';
import type { FormState } from './formstate';

const EH_STUFEN: EhStufe[] = [
  'Effizienzhaus 40',
  'Effizienzhaus 55',
  'Effizienzhaus 70',
  'Effizienzhaus 85',
  'Effizienzhaus Denkmal',
];

export function FoerderprofilCard({ form, onChange }: { form: FormState; onChange: (partial: Partial<FormState>) => void }) {
  const selbstnutzend = form.antrag === 'Privatperson (selbstnutzend)';

  return (
    <Card eyebrow="Karte 2" title="Förderprofil & Boni">
      <div className="space-y-4">
        {form.neu && (
          <Field
            label="Antragsdatum Heizungstausch (KfW 458)"
            hint="Leer = heute. Geschwindigkeitsbonus (16 → 12 → 8 → 4 → 0 %) und Höchstgrenze der 1. Wohneinheit (28.000 → 22.000 €) sinken ab 01.02.2027 halbjährlich."
          >
            <TextInput type="date" value={form.antragsdatum} onChange={(e) => onChange({ antragsdatum: e.target.value })} />
          </Field>
        )}

        <Field label="Ziel-Effizienzhaus-Stufe" hint="Für die KfW-261-Berechnung (Variante B).">
          <Select value={form.ehstufe} onChange={(e) => onChange({ ehstufe: e.target.value as EhStufe })}>
            {EH_STUFEN.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <Checkbox
            label="Individueller Sanierungsfahrplan (iSFP)"
            hint="+5 % Bonus BEG EM, EBW-Zuschuss 50 % (Karte 4)."
            checked={form.isfp}
            onChange={(e) => onChange({ isfp: e.target.checked })}
          />
          {selbstnutzend && (
            <Checkbox
              label="Klimageschwindigkeitsbonus"
              hint="Austausch einer alten fossilen Heizung, nur selbstnutzend."
              checked={form.klima}
              onChange={(e) => onChange({ klima: e.target.checked })}
            />
          )}
          {!form.neu && (
            <Checkbox
              label="Effizienzbonus"
              hint="Nur Rechtsstand ALT — entfällt NEU ersatzlos."
              checked={form.effizienz}
              onChange={(e) => onChange({ effizienz: e.target.checked })}
            />
          )}
          <Checkbox
            label="Worst-Performing-Building-Bonus (WPB)"
            hint="+10 Prozentpunkte KfW 261, nur EH 40/55/70."
            checked={form.wpb}
            onChange={(e) => onChange({ wpb: e.target.checked })}
          />
          <Checkbox
            label="Serielle Sanierung (SerSan)"
            hint="EH 40/55 +15 pp, NEU zusätzlich EH 70 EE +5 pp."
            checked={form.sersan}
            onChange={(e) => onChange({ sersan: e.target.checked })}
          />
          <Checkbox
            label="Erneuerbare-Energien-Klasse (EE)"
            hint="Nur Rechtsstand ALT und ohne kombinierten 458-Antrag wirksam."
            checked={form.eeklasse}
            onChange={(e) => onChange({ eeklasse: e.target.checked })}
          />
          <Checkbox
            label="Nachhaltigkeits-Klasse NH/QNG"
            hint="+5 Prozentpunkte KfW 261, nur Rechtsstand NEU."
            checked={form.nhklasse}
            onChange={(e) => onChange({ nhklasse: e.target.checked })}
          />
          <Checkbox
            label="Heizungstausch im 261-Antrag kombinieren"
            hint="KfW 458 zusammen mit dem Effizienzhaus-Antrag stellen (Variante B)."
            checked={form.kombi458}
            onChange={(e) => onChange({ kombi458: e.target.checked })}
          />
        </div>
      </div>
    </Card>
  );
}
