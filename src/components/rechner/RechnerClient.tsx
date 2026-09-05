'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { berechneSanierungAction, holeToken } from '@/app/rechner/actions';
import type { SanierungsErgebnis, WirtschaftlichkeitErgebnis } from '@/lib/calculator/types';
import { STANDARD_FORM, toInput, toWirtschaftlichkeitEingabe, type FormState } from './formstate';
import { LiegenschaftCard } from './LiegenschaftCard';
import { FoerderprofilCard } from './FoerderprofilCard';
import { GewerkeKostenCard } from './GewerkeKostenCard';
import { KostenCard } from './KostenCard';
import { WirtschaftlichkeitCard } from './WirtschaftlichkeitCard';
import { EigentuemerwechselCard, eigentuemerwechselStandard, type EigentuemerwechselState } from './EigentuemerwechselCard';
import { HinweiseAccordion } from './HinweiseAccordion';
import { ResultPanel } from './ResultPanel';
import { MobileResultBar } from './MobileResultBar';
import { PrintReport } from './PrintReport';
import { GebaeudeSpeichern } from './GebaeudeSpeichern';
import { GebaeudeBanner } from './GebaeudeBanner';
import { useGebaeudeKontext } from './useGebaeudeKontext';
import { ausStammdaten, inStammdaten } from '@/lib/gebaeude/adapter';

/** Debounce-Dauer für die Echtzeit-Berechnung; es gibt keinen Berechnen-Knopf. */
const DEBOUNCE_MS = 250;

/** Kompletter Eingabezustand fuer "Gespeicherte Gebaeude". Die Mengen der
 *  Gewerke-Kostenschaetzung und die Angaben der Eigentuemerwechsel-Pruefung
 *  lagen frueher nur in den Karten selbst -- ohne sie hier hochzuziehen
 *  gingen sie beim Speichern verloren. */
interface GespeichertePayload {
  form: FormState;
  gewerkeMengen: Record<string, string>;
  eigentuemerwechsel: EigentuemerwechselState;
}

export function RechnerClient({ initialToken }: { initialToken: string }) {
  const [form, setForm] = useState<FormState>(STANDARD_FORM);
  const [gewerkeMengen, setGewerkeMengen] = useState<Record<string, string>>({});
  const [eigentuemerwechsel, setEigentuemerwechsel] = useState<EigentuemerwechselState>(() =>
    eigentuemerwechselStandard(STANDARD_FORM.we),
  );
  const [ergebnis, setErgebnis] = useState<SanierungsErgebnis | null>(null);
  const [wirtschaftlichkeit, setWirtschaftlichkeit] = useState<WirtschaftlichkeitErgebnis | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(initialToken);
  const honeypotRef = useRef<HTMLInputElement>(null);
  // Zaehlt jeden gestarteten Berechnungslauf durch -- verhindert, dass eine
  // spaeter aufgeloeste, aeltere Antwort ein bereits aktuelleres Ergebnis
  // ueberschreibt.
  const generationRef = useRef(0);

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function zuruecksetzen() {
    setForm(STANDARD_FORM);
    setGewerkeMengen({});
    setEigentuemerwechsel(eigentuemerwechselStandard(STANDARD_FORM.we));
  }

  function gespeichertesLaden(p: GespeichertePayload) {
    // Mit den Standardwerten mischen: ein aelterer Speicherstand ohne
    // spaeter hinzugekommene Felder bleibt so ladbar.
    setForm({ ...STANDARD_FORM, ...p.form });
    setGewerkeMengen(p.gewerkeMengen ?? {});
    setEigentuemerwechsel({ ...eigentuemerwechselStandard(p.form?.we ?? STANDARD_FORM.we), ...p.eigentuemerwechsel });
  }

  /* Studio: per ?gebaeude=<id> geoeffnet -- eigenen Knoten laden, sonst aus den Stammdaten vorbelegen. */
  const [gebaeudeModus, setGebaeudeModus] = useState<'geladen' | 'vorbelegt' | undefined>(undefined);
  const { kontext: gebaeude, fehler: gebaeudeFehler } = useGebaeudeKontext((k) => {
    const knoten = k.detail.knoten.find((n) => n.tool_slug === 'sanierungsrechner');
    if (knoten) {
      gespeichertesLaden(knoten.eingaben as GespeichertePayload);
      setGebaeudeModus('geladen');
    } else {
      setForm((prev) => ({ ...prev, ...ausStammdaten(k.detail.gebaeude.stammdaten) }));
      setGebaeudeModus('vorbelegt');
    }
  });

  /** Kennzahlen fuer die Gebaeudekarte im Studio. */
  const zusammenfassung: Record<string, unknown> = ergebnis
    ? { foerderung_eur: ergebnis.bestesFoerderErgebnis, variante: ergebnis.empfohleneVariante, foerderquote: ergebnis.foerderquote }
    : {};

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const generation = ++generationRef.current;
      startTransition(async () => {
        try {
          const input = toInput(form);
          const wirtschaftlichkeitEingabe = toWirtschaftlichkeitEingabe(form);
          const websiteUrl = honeypotRef.current?.value;
          let antwort = await berechneSanierungAction(input, wirtschaftlichkeitEingabe, tokenRef.current, websiteUrl);

          // Token abgelaufen oder noch keins ausgestellt → einmalig frisches holen und wiederholen.
          if (antwort.status === 'token') {
            const frisch = await holeToken();
            if (frisch) {
              tokenRef.current = frisch;
              antwort = await berechneSanierungAction(input, wirtschaftlichkeitEingabe, frisch, websiteUrl);
            }
          }

          // Waehrenddessen ist bereits ein neuerer Lauf gestartet -- diese
          // Antwort ist veraltet und darf das aktuellere Ergebnis nicht mehr
          // ueberschreiben.
          if (generation !== generationRef.current) return;

          if (antwort.status === 'ok') {
            setErgebnis(antwort.ergebnis);
            setWirtschaftlichkeit(antwort.wirtschaftlichkeit);
            setBlocked(false);
          } else {
            setBlocked(true);
          }
        } catch (e) {
          // Netzwerkfehler, Timeout o.ae.: ohne diesen Catch bliebe der
          // Fehler unbehandelt und der Nutzer saehe nur ein staendig
          // ladendes Panel ohne jede Rueckmeldung.
          if (generation === generationRef.current) {
            console.error('Berechnung fehlgeschlagen:', e);
            setBlocked(true);
          }
        }
      });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form]);

  return (
    <>
      <div className="no-print grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Honeypot — für Menschen unsichtbar, siehe globals.css */}
          <input
            ref={honeypotRef}
            type="text"
            name="website_url"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hp-field"
            defaultValue=""
          />

          <GebaeudeBanner kundenname={gebaeude?.kundenname} objektadresse={gebaeude?.objektadresse} modus={gebaeudeModus} fehler={gebaeudeFehler} />
          <LiegenschaftCard form={form} onChange={patch} />
          <FoerderprofilCard form={form} onChange={patch} />
          <GewerkeKostenCard mengen={gewerkeMengen} onMengen={setGewerkeMengen} onChange={patch} />
          <KostenCard form={form} onChange={patch} />
          <WirtschaftlichkeitCard form={form} onChange={patch} />
          <EigentuemerwechselCard zustand={eigentuemerwechsel} onChange={setEigentuemerwechsel} />
          <HinweiseAccordion />
        </div>

        <div id="ergebnis" className="lg:sticky lg:top-6 lg:self-start">
          <ResultPanel
            ergebnis={ergebnis}
            wirtschaftlichkeit={wirtschaftlichkeit}
            blocked={blocked}
            isPending={isPending}
            onReset={zuruecksetzen}
            extra={
              <GebaeudeSpeichern<GespeichertePayload>
                toolSlug="sanierungsrechner"
                aktuellesPayload={{ form, gewerkeMengen, eigentuemerwechsel }}
                onLaden={gespeichertesLaden}
                stammdaten={inStammdaten(form)}
                ergebnis={zusammenfassung}
                aktivesGebaeudeId={gebaeude?.id}
                triggerClassName="mb-2 w-full rounded-full border border-white/20 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:border-mint hover:text-mint"
              />
            }
          />
        </div>

        <MobileResultBar ergebnis={ergebnis} blocked={blocked} />
      </div>

      {ergebnis && wirtschaftlichkeit && <PrintReport form={form} ergebnis={ergebnis} wirtschaftlichkeit={wirtschaftlichkeit} />}
    </>
  );
}
