import type { NextRequest } from 'next/server';
import type { Zugriffsstatus } from '@/lib/supabase/zugriffsstatus';

/**
 * Kurzlebiger In-Memory-Cache fuer das Ergebnis von zugriffsstatus(), NUR
 * fuer diesen einen Rechner (bewusst nicht auf die anderen 4 Tools
 * ausgerollt): der Live-Rechner ruft die Middleware bei jeder Eingabepause
 * (250ms) erneut auf -- ohne Cache prueft proxy.ts bei aktivem Tippen mehrmals
 * pro Sekunde live gegen die geteilte Datenbank, obwohl sich der
 * Freischaltungsstatus in dieser Zeitspanne so gut wie nie aendert.
 *
 * TTL bewusst kurz (5s): eine Sperrung/Paketaenderung durch einen Admin muss
 * innerhalb weniger Sekunden greifen, nicht erst nach der bis zu 1h alten
 * JWT-Claim-Frist, die dieses ganze Live-Pruefungs-Konzept ja gerade
 * vermeiden soll. Der Cache-Schluessel ist ein Hash der Session-Cookie(s) --
 * ändert sich die Session (Login, Logout, Token-Refresh), aendert sich der
 * Schluessel automatisch mit, kein manuelles Invalidieren noetig.
 */

const TTL_MS = 5_000;
const MAX_EINTRAEGE = 2000;

const cache = new Map<string, { zustand: Zugriffsstatus | null; ablauf: number }>();

async function sessionSchluessel(req: NextRequest): Promise<string> {
  const roh = req.cookies
    .getAll()
    .filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `${c.name}=${c.value}`)
    .join('&');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(roh));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function ausCacheLesen(req: NextRequest): Promise<Zugriffsstatus | null | undefined> {
  const schluessel = await sessionSchluessel(req);
  const eintrag = cache.get(schluessel);
  if (!eintrag || Date.now() > eintrag.ablauf) return undefined;
  return eintrag.zustand;
}

export async function inCacheSchreiben(req: NextRequest, zustand: Zugriffsstatus | null): Promise<void> {
  if (cache.size > MAX_EINTRAEGE) cache.clear();
  const schluessel = await sessionSchluessel(req);
  cache.set(schluessel, { zustand, ablauf: Date.now() + TTL_MS });
}
