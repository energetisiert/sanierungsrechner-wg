'use client';

import { useEffect, useRef, useState } from 'react';
import { gebaeudeHolenAction } from '@/app/gebaeude/actions';
import type { GebaeudeDetail } from '@/lib/gebaeude/stammdaten';

export interface GebaeudeKontext {
  id: string;
  kundenname: string;
  objektadresse: string;
  detail: GebaeudeDetail;
}

/**
 * Liest ?gebaeude=<uuid> aus der URL (Sprung aus dem Studio/Hub) und holt das
 * Gebäude einmalig. Bewusst über window.location statt useSearchParams, damit
 * kein Suspense-Boundary nötig wird. `onGeladen` wird nach dem Laden genau
 * einmal aufgerufen -- dort entscheidet das Tool, ob es seinen gespeicherten
 * Knoten lädt oder aus den Stammdaten vorbelegt (asynchron, also kein
 * setState direkt im Effekt).
 */
export function useGebaeudeKontext(onGeladen?: (kontext: GebaeudeKontext) => void): {
  kontext: GebaeudeKontext | null;
  fehler: string | null;
} {
  const [kontext, setKontext] = useState<GebaeudeKontext | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const callbackRef = useRef(onGeladen);
  // Im Effekt statt waehrend des Renderns schreiben (react-hooks/refs).
  useEffect(() => {
    callbackRef.current = onGeladen;
  });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('gebaeude');
    if (!id) return;
    let aktiv = true;
    gebaeudeHolenAction(id)
      .then((antwort) => {
        if (!aktiv) return;
        if ('fehler' in antwort) {
          setFehler(antwort.fehler);
          return;
        }
        const k: GebaeudeKontext = {
          id,
          kundenname: antwort.detail.gebaeude.kundenname,
          objektadresse: antwort.detail.gebaeude.objektadresse,
          detail: antwort.detail,
        };
        setKontext(k);
        callbackRef.current?.(k);
      })
      .catch(() => {
        if (aktiv) setFehler('Gebäude konnte nicht geladen werden.');
      });
    return () => {
      aktiv = false;
    };
  }, []);

  return { kontext, fehler };
}
