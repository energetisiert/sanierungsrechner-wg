'use client';

import { useEffect, useState } from 'react';
import {
  gebaeudeHolenAction, gebaeudeListeAction, gebaeudeLoeschenAction, imGebaeudeSpeichernAction, knotenLoeschenAction,
} from '@/app/gebaeude/actions';
import type { GebaeudeEintrag, GebaeudeStammdaten } from '@/lib/gebaeude/stammdaten';

/**
 * "Im Gebäude speichern" -- Studio-Gebäudemodell. Ein Gebäude einmal anlegen,
 * jedes Tool hängt seinen kompletten Eingabezustand als Knoten daran (ein
 * Knoten je Tool, "Aktualisieren" ersetzt ihn) und schreibt seine
 * Stammdaten-Felder zurück. Pro Tool kopierte Komponente (Tailwind-Variante
 * des Heizlastrechner-Dialogs), Server Actions in app/gebaeude/actions.ts.
 */
const TOOL_KURZ: Record<string, string> = {
  heizlastrechner: 'HL', 'heizlastrechner-gep': 'HG', foerderrechner: 'FH', gebaeudeabgrenzung: 'GA',
  'co2-rechner': 'CO', sanierungsrechner: 'SW', foerderstrategie: 'FS',
};

export function GebaeudeSpeichern<TPayload>({
  toolSlug, aktuellesPayload, onLaden, stammdaten, ergebnis, triggerClassName, aktivesGebaeudeId,
}: {
  toolSlug: string;
  aktuellesPayload: TPayload;
  onLaden: (payload: TPayload) => void;
  stammdaten: Partial<GebaeudeStammdaten>;
  ergebnis: Record<string, unknown>;
  /** Klassen des Auslöse-Buttons -- passt sich dem jeweiligen Ergebnispanel an. */
  triggerClassName: string;
  /** Über ?gebaeude=<id> geöffnetes Gebäude -- steht in der Liste oben und ist als "geöffnet" markiert. */
  aktivesGebaeudeId?: string | null;
}) {
  const [offen, setOffen] = useState(false);
  const [liste, setListe] = useState<GebaeudeEintrag[] | null>(null);
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
      const antwort = await gebaeudeListeAction();
      if ('fehler' in antwort) {
        setLadeFehler(antwort.fehler);
        return;
      }
      const sortiert = [...antwort.gebaeude].sort((a, b) => (a.id === aktivesGebaeudeId ? -1 : b.id === aktivesGebaeudeId ? 1 : 0));
      setListe(sortiert);
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
    setListe(null);
    void listeAktualisieren();
  }

  async function speichernIn(gebaeudeId?: string) {
    if (!gebaeudeId && (!kundenname.trim() || !objektadresse.trim())) {
      setSpeichernFehler('Bitte Kundenname und Objektadresse angeben.');
      return;
    }
    setSpeichernFehler('');
    setSendet(true);
    try {
      const antwort = await imGebaeudeSpeichernAction({
        gebaeudeId,
        kundenname: gebaeudeId ? undefined : kundenname.trim(),
        objektadresse: gebaeudeId ? undefined : objektadresse.trim(),
        stammdaten,
        eingaben: aktuellesPayload,
        ergebnis,
      });
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

  async function laden(g: GebaeudeEintrag) {
    setLadeFehler('');
    try {
      const antwort = await gebaeudeHolenAction(g.id);
      if ('fehler' in antwort) {
        setLadeFehler(antwort.fehler);
        return;
      }
      const knoten = antwort.detail.knoten.find((k) => k.tool_slug === toolSlug);
      if (!knoten) {
        setLadeFehler('An diesem Gebäude ist für dieses Tool noch nichts gespeichert.');
        return;
      }
      onLaden(knoten.eingaben as TPayload);
      setOffen(false);
    } catch {
      setLadeFehler('Laden fehlgeschlagen.');
    }
  }

  async function knotenEntfernen(g: GebaeudeEintrag) {
    const knoten = g.knoten.find((k) => k.tool_slug === toolSlug);
    if (!knoten) return;
    const antwort = await knotenLoeschenAction(knoten.id);
    if ('fehler' in antwort) setLadeFehler(antwort.fehler);
    else await listeAktualisieren();
  }

  async function gebaeudeEntfernen(g: GebaeudeEintrag) {
    if (!window.confirm(`Gebäude „${g.kundenname}“ mit allen gespeicherten Berechnungen löschen?`)) return;
    const antwort = await gebaeudeLoeschenAction(g.id);
    if ('fehler' in antwort) setLadeFehler(antwort.fehler);
    else setListe((prev) => prev?.filter((e) => e.id !== g.id) ?? null);
  }

  const fehlerKlasse = 'rounded-xl border border-red/30 bg-red/[0.05] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-red';
  const inputKlasse =
    'w-full rounded-xl border border-strong/50 bg-bg px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition-colors focus:border-ac';
  const linkKlasse = 'text-[12.5px] font-semibold text-ac hover:underline disabled:opacity-50';

  return (
    <>
      <button type="button" className={triggerClassName} onClick={oeffnen}>
        Im Gebäude speichern
      </button>

      {offen && (
        <div className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-dark/60 p-5" onClick={() => setOffen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gg-titel"
            className="max-h-[calc(100vh-40px)] w-full max-w-[480px] overflow-y-auto rounded-[20px] bg-white p-6 text-ink shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 id="gg-titel" className="font-disp text-[16.5px] font-bold tracking-[-0.01em] text-ink">Im Gebäude speichern</h2>
              <button type="button" onClick={() => setOffen(false)} aria-label="Schließen" className="-mr-1 px-1 text-[22px] leading-none text-muted2 transition-colors hover:text-ink">×</button>
            </div>
            <p className="mb-3 text-[12.5px] leading-[1.5] text-muted">
              Ein Gebäude einmal anlegen, alle Tools daran anknüpfen. Gespeichert wird der komplette Eingabezustand dieses Tools; das
              Ergebnis wird beim Laden neu gerechnet.
            </p>

            {ladeFehler && <div className={`${fehlerKlasse} mb-3`}>{ladeFehler}</div>}
            {liste === null && !ladeFehler && <p className="text-[13px] text-muted">Lädt …</p>}
            {liste !== null && liste.length === 0 && <p className="text-[13px] text-muted">Noch keine Gebäude angelegt.</p>}
            {liste !== null && liste.length > 0 && (
              <ul className="divide-y divide-strong/15">
                {liste.map((g) => {
                  const eigener = g.knoten.some((k) => k.tool_slug === toolSlug);
                  const geoeffnet = g.id === aktivesGebaeudeId;
                  return (
                    <li key={g.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0 text-[13px]">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {g.kundenname}
                          {geoeffnet && <span className="ml-2 rounded-full bg-ac/15 px-2 py-0.5 text-[10px] font-bold text-ac">geöffnet</span>}
                        </p>
                        <p className="truncate text-muted">{g.objektadresse}</p>
                        <p className="mt-1 flex flex-wrap gap-1">
                          {g.knoten.length === 0 && <span className="text-[11px] text-muted2">noch ohne Berechnung</span>}
                          {g.knoten.map((k) => (
                            <span
                              key={k.id}
                              title={k.tool_slug}
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${k.tool_slug === toolSlug ? 'bg-ac text-white' : 'bg-tint text-muted'}`}
                            >
                              {TOOL_KURZ[k.tool_slug] ?? k.tool_slug}
                            </span>
                          ))}
                        </p>
                      </div>
                      <div className="flex flex-none flex-wrap justify-end gap-x-3 gap-y-1">
                        {eigener && <button type="button" className={linkKlasse} onClick={() => laden(g)}>Laden</button>}
                        <button type="button" className={linkKlasse} disabled={sendet} onClick={() => speichernIn(g.id)}>
                          {eigener ? 'Aktualisieren' : 'Hier speichern'}
                        </button>
                        {eigener ? (
                          <button type="button" className="text-[12.5px] font-semibold text-red hover:underline" onClick={() => knotenEntfernen(g)}>Entfernen</button>
                        ) : (
                          <button type="button" className="text-[12.5px] font-semibold text-red hover:underline" onClick={() => gebaeudeEntfernen(g)}>Löschen</button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <hr className="my-4 border-strong/15" />
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-strong">Neues Gebäude anlegen</p>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">Kundenname</span>
              <input type="text" className={inputKlasse} value={kundenname} onChange={(e) => setKundenname(e.target.value)} />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">Objektadresse</span>
              <input type="text" className={inputKlasse} placeholder="Straße, Hausnummer, PLZ, Ort" value={objektadresse} onChange={(e) => setObjektadresse(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={sendet}
              onClick={() => speichernIn()}
              className="flex min-h-11 w-full items-center justify-center rounded-full bg-doc text-[13.5px] font-semibold text-white transition-colors hover:bg-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendet ? 'Wird gespeichert …' : 'Anlegen und speichern'}
            </button>
            {speichernFehler && <div className={`${fehlerKlasse} mt-3`}>{speichernFehler}</div>}
          </div>
        </div>
      )}
    </>
  );
}
