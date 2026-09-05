'use client';

import { Card } from '@/components/ui/Card';
import { Field, TextInput } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';

export type JaNeinUnklar = 'ja' | 'nein' | 'unklar';

/** Alle Angaben der Sonderpruefung -- liegt im RechnerClient, damit
 *  "Gespeicherte Gebaeude" sie mitnimmt (frueher nur lokaler Karten-State). */
export interface EigentuemerwechselState {
  wohneinheiten: string;
  selbstbewohnt2002: JaNeinUnklar | null;
  ersterEigentuemer: JaNeinUnklar | null;
  uebertragungsdatum: string;
  erbschaft: boolean;
  deckeGedaemmt: JaNeinUnklar | null;
  leitungenGedaemmt: JaNeinUnklar | null;
}

export function eigentuemerwechselStandard(wohneinheiten: string): EigentuemerwechselState {
  return {
    wohneinheiten,
    selbstbewohnt2002: null,
    ersterEigentuemer: null,
    uebertragungsdatum: '',
    erbschaft: false,
    deckeGedaemmt: null,
    leitungenGedaemmt: null,
  };
}

const JA_NEIN_UNKLAR_OPTIONEN = [
  { value: 'ja' as const, label: 'Ja' },
  { value: 'nein' as const, label: 'Nein' },
  { value: 'unklar' as const, label: 'Weiß nicht' },
];

/**
 * Nachrüstpflicht bei Eigentümerwechsel: §§ 35, 69 GModG (bis 28.07.2026
 * "GEG" genannt, seit der Novelle vom 23.07.2026 offiziell
 * Gebäudemodernisierungsgesetz). NICHT § 60 GModG — der regelt nur die
 * laufende Wartungspflicht des Betreibers, ohne jeden Bezug zu einem
 * Eigentümerwechsel. Rechtsstand dieser Komponente: Sommer 2026, per
 * direktem Abruf von gesetze-im-internet.de/geg geprüft (siehe Disclaimer
 * unten) -- vor dem 1.1.2027 erneut gegenprüfen, da drei weitere
 * Novellierungs-Tranchen des Gesetzes vom 23.07.2026 zu diesem Datum sowie
 * 1.1.2028 und 1.1.2030 in Kraft treten und im aktuell konsolidierten Text
 * noch nicht enthalten sind.
 *
 * Kernlogik (Absätze wie im Gesetzestext, siehe Recherche-Protokoll):
 * - Gilt ausschließlich für Wohngebäude mit höchstens 2 Wohnungen. Bei 3+
 *   Einheiten (WEG) betrifft die Pflicht das Gemeinschaftseigentum, nicht
 *   den einzelnen Käufer -- kein individueller Fristlauf.
 * - Die Ausnahme (kein sofortiger Zwang) galt nur, wenn ein Eigentümer eine
 *   der Wohnungen bereits am 01.02.2002 selbst bewohnt hat. Diese Ausnahme
 *   endet endgültig beim ERSTEN Eigentumsübergang nach dem 01.02.2002 --
 *   ab dann läuft eine 2-Jahres-Frist (Gesetzestext "zwei Jahre"; eine
 *   Verbraucherzentrale-Quelle nennt an anderer Stelle drei Jahre, siehe
 *   Disclaimer -- bewusst die kürzere, im Gesetzestext selbst stehende
 *   Frist als Grundlage genommen).
 * - War der jetzige Eigentümer NICHT der erste Käufer seit 01.02.2002,
 *   ist die Frist bereits gegen den früheren Eigentümer gelaufen -- die
 *   Pflicht besteht dann unabhängig vom eigenen Kaufdatum bereits jetzt.
 * - Frist beginnt mit der Grundbucheintragung (nicht dem Notartermin) bzw.
 *   bei Erbschaft mit dem Todestag.
 * - Die frühere, altersabhängige Heizkessel-Austauschpflicht ist mit der
 *   Novelle vom 23.07.2026 ersatzlos gestrichen -- deshalb hier bewusst
 *   keine Frage dazu.
 */

type Wechselfall = 'nicht-betroffen' | 'weg' | 'unmittelbar' | 'first-owner' | 'unklar-owner';

function ermittleWechselfall(wohneinheiten: number, selbstbewohnt2002: JaNeinUnklar | null, ersterEigentuemer: JaNeinUnklar | null): Wechselfall {
  if (wohneinheiten >= 3) return 'weg';
  if (selbstbewohnt2002 === null) return 'nicht-betroffen';
  if (selbstbewohnt2002 !== 'ja') return 'unmittelbar';
  if (ersterEigentuemer === null) return 'nicht-betroffen';
  if (ersterEigentuemer === 'nein') return 'unmittelbar';
  if (ersterEigentuemer === 'unklar') return 'unklar-owner';
  return 'first-owner';
}

function formatiereDatum(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function KomponentenErgebnis({ label, zustand }: { label: string; zustand: JaNeinUnklar | null }) {
  if (zustand === null) return null;
  const stil =
    zustand === 'ja'
      ? { text: 'Pflicht bereits erfüllt', farbe: 'text-ac', icon: '✓' }
      : zustand === 'nein'
        ? { text: 'Nachrüstpflicht besteht', farbe: 'text-red', icon: '×' }
        : { text: 'Nicht sicher zu beurteilen', farbe: 'text-warm', icon: '?' };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-strong/15 px-3.5 py-2.5">
      <span className="text-[13px] font-semibold text-strong">{label}</span>
      <span className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${stil.farbe}`}>
        <span aria-hidden="true">{stil.icon}</span>
        {stil.text}
      </span>
    </div>
  );
}

export function EigentuemerwechselCard({
  zustand,
  onChange,
}: {
  zustand: EigentuemerwechselState;
  onChange: (zustand: EigentuemerwechselState) => void;
}) {
  const { wohneinheiten, selbstbewohnt2002, ersterEigentuemer, uebertragungsdatum, erbschaft, deckeGedaemmt, leitungenGedaemmt } =
    zustand;
  const aendern = (patch: Partial<EigentuemerwechselState>) => onChange({ ...zustand, ...patch });
  const setWohneinheiten = (v: string) => aendern({ wohneinheiten: v });
  const setSelbstbewohnt2002 = (v: JaNeinUnklar | null) => aendern({ selbstbewohnt2002: v });
  const setErsterEigentuemer = (v: JaNeinUnklar | null) => aendern({ ersterEigentuemer: v });
  const setUebertragungsdatum = (v: string) => aendern({ uebertragungsdatum: v });
  const setErbschaft = (v: boolean) => aendern({ erbschaft: v });
  const setDeckeGedaemmt = (v: JaNeinUnklar | null) => aendern({ deckeGedaemmt: v });
  const setLeitungenGedaemmt = (v: JaNeinUnklar | null) => aendern({ leitungenGedaemmt: v });

  const we = Math.max(1, Math.round(Number(wohneinheiten)) || 1);
  const fall = ermittleWechselfall(we, selbstbewohnt2002, ersterEigentuemer);
  const zeigtTechnikfragen = fall === 'unmittelbar' || fall === 'first-owner' || fall === 'unklar-owner';

  let fristStatus: { text: string; abgelaufen: boolean } | null = null;
  if (fall === 'first-owner' && uebertragungsdatum) {
    const start = new Date(uebertragungsdatum);
    if (!Number.isNaN(start.getTime())) {
      const frist = new Date(start);
      frist.setFullYear(frist.getFullYear() + 2);
      const heute = new Date();
      const abgelaufen = heute.getTime() > frist.getTime();
      fristStatus = {
        abgelaufen,
        text: abgelaufen
          ? `Die 2-Jahres-Frist ist am ${formatiereDatum(frist)} abgelaufen — die Pflicht besteht unabhängig davon fort, sofern noch nicht erfüllt.`
          : `Frist bis ${formatiereDatum(frist)} (2 Jahre ab ${erbschaft ? 'Todestag' : 'Grundbucheintragung'}).`,
      };
    }
  }

  return (
    <Card eyebrow="Sonderprüfung" title="Nachrüstpflicht bei Eigentümerwechsel">
      <div className="space-y-4">
        <p className="text-[13px] leading-[1.55] text-muted">
          Prüft, ob wegen eines Eigentümerwechsels gesetzliche Nachrüstpflichten nach §§ 35, 69 GModG (bis Juli 2026 als „GEG“
          bekannt) greifen — ungedämmte oberste Geschossdecke bzw. ungedämmte Heizungs-/Warmwasserleitungen. Unabhängig von
          dieser Sonderprüfung.
        </p>

        <Field label="Wohneinheiten im Gebäude" hint="Die Ausnahmeregelung gilt nur für Ein- und Zweifamilienhäuser.">
          <TextInput type="number" min={1} step={1} value={wohneinheiten} onChange={(e) => setWohneinheiten(e.target.value)} />
        </Field>

        {fall === 'weg' && (
          <div className="rounded-xl border border-strong/15 bg-bg px-3.5 py-3 text-[12.5px] leading-[1.55] text-muted">
            Bei 3 oder mehr Wohneinheiten betrifft die Nachrüstpflicht das Gemeinschaftseigentum der WEG, nicht den einzelnen
            Käufer einer Wohnung — es gibt keinen individuellen Fristlauf durch den Kauf. Ob die Decke/Leitungen bereits
            gedämmt sind, lässt sich hier nicht prüfen — bitte Protokolle der Eigentümerversammlung bzw. die Hausverwaltung
            fragen.
          </div>
        )}

        {fall !== 'weg' && (
          <>
            <div>
              <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">
                Hat ein Eigentümer eine der Wohnungen bereits am 1. Februar 2002 selbst bewohnt?
              </span>
              <Segmented
                aria-label="Selbstbewohnt am 1. Februar 2002"
                value={selbstbewohnt2002}
                onChange={setSelbstbewohnt2002}
                options={JA_NEIN_UNKLAR_OPTIONEN}
              />
            </div>

            {selbstbewohnt2002 === 'nein' && (
              <p className="text-[12.5px] leading-[1.55] text-muted">
                Die Ausnahme griff dann nie — die Pflicht gilt direkt und durchgehend, unabhängig von einem Eigentümerwechsel.
              </p>
            )}

            {selbstbewohnt2002 === 'unklar' && (
              <p className="text-[12.5px] leading-[1.55] text-warm">
                Ohne diese Angabe lässt sich die Ausnahme nicht sicher belegen — wir gehen hier vorsorglich davon aus, dass
                sie nicht greift, und zeigen die Pflicht als direkt geltend. Bitte im Zweifel anhand alter Meldeunterlagen
                oder beim Voreigentümer klären.
              </p>
            )}

            {selbstbewohnt2002 === 'ja' && (
              <div>
                <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">
                  Sind Sie der erste Eigentümer seit dem 1. Februar 2002?
                </span>
                <Segmented
                  aria-label="Erster Eigentümer seit 1. Februar 2002"
                  value={ersterEigentuemer}
                  onChange={setErsterEigentuemer}
                  options={JA_NEIN_UNKLAR_OPTIONEN}
                />
              </div>
            )}

            {ersterEigentuemer === 'nein' && (
              <p className="text-[12.5px] leading-[1.55] text-muted">
                Dann ist die 2-Jahres-Frist bereits gegen den vorherigen Eigentümer gelaufen — die Pflicht besteht unabhängig
                vom eigenen Kaufdatum bereits jetzt, sofern noch nicht erfüllt.
              </p>
            )}

            {fall === 'first-owner' && (
              <>
                <Field
                  label="Datum der Eigentumsübertragung"
                  hint="Grundbucheintragung, nicht der Termin beim Notar — bei Erbschaft der Todestag."
                >
                  <TextInput type="date" value={uebertragungsdatum} onChange={(e) => setUebertragungsdatum(e.target.value)} />
                </Field>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={erbschaft}
                    onChange={(e) => setErbschaft(e.target.checked)}
                    className="size-4 flex-none accent-ac"
                  />
                  <span className="text-[13px] text-strong">Erwerb durch Erbschaft (Fristbeginn = Todestag)</span>
                </label>
                {fristStatus && (
                  <p className={`text-[12.5px] font-semibold leading-[1.55] ${fristStatus.abgelaufen ? 'text-red' : 'text-ac'}`}>
                    {fristStatus.text}
                  </p>
                )}
              </>
            )}

            {fall === 'unklar-owner' && (
              <p className="text-[12.5px] leading-[1.55] text-warm">
                Ohne die Transaktionshistorie des Gebäudes lässt sich das nicht sicher bestimmen. War zwischen 2002 und Ihrem
                Kauf bereits ein anderer Eigentümer, ist die Pflicht bereits unabhängig von Ihrem eigenen Kaufdatum fällig.
              </p>
            )}

            {zeigtTechnikfragen && (
              <div className="space-y-3 border-t border-strong/10 pt-3.5">
                <div>
                  <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">
                    Oberste Geschossdecke gedämmt (U ≤ 0,24 W/m²K) oder Dach darüber gedämmt?
                  </span>
                  <Segmented aria-label="Geschossdecke gedämmt" value={deckeGedaemmt} onChange={setDeckeGedaemmt} options={JA_NEIN_UNKLAR_OPTIONEN} />
                </div>
                <div>
                  <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">
                    Zugängliche Heizungs-/Warmwasserleitungen in unbeheizten Räumen gedämmt?
                  </span>
                  <Segmented
                    aria-label="Leitungen gedämmt"
                    value={leitungenGedaemmt}
                    onChange={setLeitungenGedaemmt}
                    options={JA_NEIN_UNKLAR_OPTIONEN}
                  />
                </div>
                <div className="space-y-2 pt-1">
                  <KomponentenErgebnis label="Oberste Geschossdecke / Dach" zustand={deckeGedaemmt} />
                  <KomponentenErgebnis label="Heizungs-/Warmwasserleitungen" zustand={leitungenGedaemmt} />
                </div>
              </div>
            )}
          </>
        )}

        <div className="rounded-xl bg-bg px-3.5 py-3 text-[11.5px] leading-[1.55] text-muted2">
          Unverbindliche, automatisierte Orientierungshilfe auf Basis der Rechtslage §§ 35, 69 GModG (Stand: Sommer 2026,
          direkt bei gesetze-im-internet.de geprüft) — ersetzt keine rechtliche oder energetische Einzelfallberatung. Eine
          Quelle (Verbraucherzentrale) nennt an anderer Stelle eine 3- statt 2-Jahres-Frist; hier bewusst die kürzere, im
          Gesetzestext selbst stehende Frist zugrunde gelegt. Eine Befreiung ist zusätzlich möglich, wenn sich die Kosten
          nicht durch die Einsparung amortisieren (Wirtschaftlichkeitsvorbehalt) — das kann nur eine Einzelfallprüfung durch
          eine Energieberaterin/einen Energieberater klären. Das genaue Datum des Eigentumsübergangs und etwaige
          Vorbesitzer seit 2002 kann dieses Tool nicht selbst prüfen.
        </div>
      </div>
    </Card>
  );
}
