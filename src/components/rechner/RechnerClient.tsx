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
import { EigentuemerwechselCard } from './EigentuemerwechselCard';
import { HinweiseAccordion } from './HinweiseAccordion';
import { ResultPanel } from './ResultPanel';
import { MobileResultBar } from './MobileResultBar';
import { PrintReport } from './PrintReport';

/** Debounce-Dauer für die Echtzeit-Berechnung; es gibt keinen Berechnen-Knopf. */
const DEBOUNCE_MS = 250;

export function RechnerClient({ initialToken }: { initialToken: string }) {
  const [form, setForm] = useState<FormState>(STANDARD_FORM);
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

          <LiegenschaftCard form={form} onChange={patch} />
          <FoerderprofilCard form={form} onChange={patch} />
          <GewerkeKostenCard onChange={patch} />
          <KostenCard form={form} onChange={patch} />
          <WirtschaftlichkeitCard form={form} onChange={patch} />
          <EigentuemerwechselCard wohneinheitenStandard={form.we} />
          <HinweiseAccordion />
        </div>

        <div id="ergebnis" className="lg:sticky lg:top-6 lg:self-start">
          <ResultPanel
            ergebnis={ergebnis}
            wirtschaftlichkeit={wirtschaftlichkeit}
            blocked={blocked}
            isPending={isPending}
            onReset={() => setForm(STANDARD_FORM)}
          />
        </div>

        <MobileResultBar ergebnis={ergebnis} blocked={blocked} />
      </div>

      {ergebnis && wirtschaftlichkeit && <PrintReport form={form} ergebnis={ergebnis} wirtschaftlichkeit={wirtschaftlichkeit} />}
    </>
  );
}
