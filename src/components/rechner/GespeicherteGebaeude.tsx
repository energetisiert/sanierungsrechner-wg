'use client';

import { useEffect, useState } from 'react';
import {
  gespeicherteLadenAction,
  gespeichertesLoeschenAction,
  gespeichertesSpeichernAction,
  type GespeichertesErgebnis,
} from '@/app/gespeichert/actions';

/**
 * Gespeicherte Gebäude -- pro Tool kopierte Komponente (bewusst kein geteiltes
 * Monorepo-Paket, konsistent mit proxy-guard.ts/cookie-options.ts). Gegenstück
 * zu components/GespeicherteErgebnisse.tsx im Heizlastrechner/GEP, hier mit
 * Tailwind-Klassen und Server Actions (app/gespeichert/actions.ts) statt
 * Route Handlern.
 *
 * `TPayload` ist der komplette Eingabezustand des jeweiligen Tools (nicht das
 * Ergebnis -- das wird nach dem Laden ganz normal neu berechnet).
 *
 * Auslöser ist ein einzelner Button ("Gebäude speichern") direkt unter dem
 * PDF-Button; erst der Klick öffnet das Fenster mit der Liste bereits
 * gespeicherter Gebäude (Laden/Löschen) und dem Speichern-Formular
 * (Kundenname, Objektadresse) -- kein dauerhaft sichtbarer Bereich.
 */
export function GespeicherteGebaeude<TPayload>({
  aktuellesPayload,
  onLaden,
  triggerClassName,
}: {
  aktuellesPayload: TPayload;
  onLaden: (payload: TPayload) => void;
  /** Klassen des Auslöse-Buttons -- so passt er sich dem jeweiligen Ergebnispanel an. */
  triggerClassName: string;
}) {
  const [offen, setOffen] = useState(false);
  const [liste, setListe] = useState<GespeichertesErgebnis[] | null>(null);
  const [ladeFehler, setLadeFehler] = useState('');

  const [kundenname, setKundenname] = useState('');
  const [objektadresse, setObjektadresse] = useState('');
  const [speichernFehler, setSpeichernFehler] = useState('');
  const [sendet, setSendet] = useState(false);

  useEffect(() => {
    if (!offen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOffen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [offen]);

  async function listeAktualisieren() {
    try {
      const antwort = await gespeicherteLadenAction();
      if ('fehler' in antwort) {
        setLadeFehler(antwort.fehler);
        return;
      }
      setListe(antwort.ergebnisse);
      setLadeFehler('');
    } catch {
      setLadeFehler('Laden fehlgeschlagen.');
    }
  }

  function oeffnen() {
    setOffen(true);
    setSpeichernFehler('');
    setKundenname('');
    setObjektadresse('');
    // Immer neu laden, nicht nur beim ersten Öffnen -- sonst zeigt ein
    // erneutes Öffnen nach dem Speichern noch den alten Stand.
    setListe(null);
    void listeAktualisieren();
  }

  async function speichern() {
    if (!kundenname.trim() || !objektadresse.trim()) {
      setSpeichernFehler('Bitte Kundenname und Objektadresse angeben.');
      return;
    }
    setSpeichernFehler('');
    setSendet(true);
    try {
      const antwort = await gespeichertesSpeichernAction(kundenname.trim(), objektadresse.trim(), aktuellesPayload);
      if ('fehler' in antwort) {
        setSpeichernFehler(antwort.fehler);
        return;
      }
      setOffen(false);
    } catch {
      setSpeichernFehler('Speichern fehlgeschlagen.');
    } finally {
      setSendet(false);
    }
  }

  async function loeschen(id: string) {
    try {
      const antwort = await gespeichertesLoeschenAction(id);
      if ('fehler' in antwort) {
        setLadeFehler(antwort.fehler);
        return;
      }
      setListe((prev) => prev?.filter((e) => e.id !== id) ?? null);
    } catch {
      setLadeFehler('Löschen fehlgeschlagen.');
    }
  }

  function laden(payload: unknown) {
    onLaden(payload as TPayload);
    setOffen(false);
  }

  const fehlerKlasse = 'rounded-xl border border-red/30 bg-red/[0.05] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-red';
  const inputKlasse =
    'w-full rounded-xl border border-strong/50 bg-bg px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition-colors focus:border-ac';

  return (
    <>
      <button type="button" className={triggerClassName} onClick={oeffnen}>
        Gebäude speichern
      </button>

      {offen && (
        <div
          className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-dark/60 p-5"
          onClick={() => setOffen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gg-titel"
            className="max-h-[calc(100vh-40px)] w-full max-w-[440px] overflow-y-auto rounded-[20px] bg-white p-6 text-ink shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="gg-titel" className="font-disp text-[16.5px] font-bold tracking-[-0.01em] text-ink">
                Gebäude speichern
              </h2>
              <button
                type="button"
                onClick={() => setOffen(false)}
                aria-label="Schließen"
                className="-mr-1 px-1 text-[22px] leading-none text-muted2 transition-colors hover:text-ink"
              >
                ×
              </button>
            </div>

            {ladeFehler && <div className={`${fehlerKlasse} mb-3`}>{ladeFehler}</div>}
            {liste === null && !ladeFehler && <p className="text-[13px] text-muted">Lädt …</p>}
            {liste !== null && liste.length === 0 && <p className="text-[13px] text-muted">Noch keine gespeicherten Gebäude.</p>}
            {liste !== null && liste.length > 0 && (
              <ul className="divide-y divide-strong/15">
                {liste.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 text-[13px]">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{e.kundenname}</p>
                      <p className="truncate text-muted">{e.objektadresse}</p>
                      <p className="text-[11.5px] text-muted2">{new Date(e.created_at).toLocaleDateString('de-DE')}</p>
                    </div>
                    <div className="flex flex-none gap-3.5 text-[13px] font-semibold">
                      <button type="button" className="text-ac hover:underline" onClick={() => laden(e.payload)}>
                        Laden
                      </button>
                      <button type="button" className="text-red hover:underline" onClick={() => loeschen(e.id)}>
                        Löschen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <hr className="my-4 border-strong/15" />

            <label className="mb-3 block">
              <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">Kundenname</span>
              <input type="text" className={inputKlasse} value={kundenname} onChange={(e) => setKundenname(e.target.value)} />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">Objektadresse</span>
              <input
                type="text"
                className={inputKlasse}
                placeholder="Straße, Hausnummer, PLZ, Ort"
                value={objektadresse}
                onChange={(e) => setObjektadresse(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={sendet}
              onClick={speichern}
              className="flex min-h-11 w-full items-center justify-center rounded-full bg-doc text-[13.5px] font-semibold text-white transition-colors hover:bg-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendet ? 'Wird gespeichert …' : 'Speichern'}
            </button>
            {speichernFehler && <div className={`${fehlerKlasse} mt-3`}>{speichernFehler}</div>}
          </div>
        </div>
      )}
    </>
  );
}
