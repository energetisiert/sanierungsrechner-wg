import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * Anti-Scraping-Schicht der Berechnungs-Action, identisches Muster (Env-
 * Namen, Fallback-Verhalten) wie im CO2-Aufteilungsrechner und im
 * Gebäudeabgrenzungsrechner, damit alle Tools einheitlich abgesichert sind:
 *
 *  1. Origin-/Referer-Enforcement über ALLOWED_ORIGINS (mit Vercel-Preview-
 *     URLs und lokalem Dev-Server als Ergänzung)
 *  2. Honeypot-Feld (website_url) — Bots, die es füllen, werden lautlos abgewiesen
 *  3. Rate Limiting: max. 60 Anfragen/Minute je SHA-256(IP + IP_SALT), über
 *     Supabase persistiert; ohne konfiguriertes Supabase greift ein
 *     In-Memory-Fallback pro Serverinstanz statt komplett ungebremst zu laufen
 *
 * Vercel BotID (checkBotId) und das signierte Request-Token laufen zusätzlich
 * direkt in app/rechner/actions.ts.
 *
 * Rate-Limit-RPC ohne Service-Role-Key (einheitlich mit dem CO2-/Förder-
 * rechner-Muster): sanierung_rate_limit_hit ist SECURITY DEFINER und
 * zählt/prüft atomar serverseitig, EXECUTE ist an anon/authenticated gewährt
 * (siehe Migration 002_..._ohne_service_role.sql) — der publishable/anon Key
 * reicht, ein zusätzliches Admin-Secret ist für dieses Projekt nicht nötig.
 */

const RATE_LIMIT_PER_MINUTE = 60;

/** Origin und Referer müssen — sofern gesetzt — auf die Allowlist zeigen. */
export async function origenErlaubt(): Promise<boolean> {
  const h = await headers();
  const origin = h.get('origin') ?? h.get('referer') ?? '';

  const erlaubt = (process.env.ALLOWED_ORIGINS ?? 'https://sanierungsrechner.energetisiert.de,https://energetisiert.de')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.VERCEL_URL) erlaubt.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) erlaubt.push(`https://${process.env.VERCEL_BRANCH_URL}`);

  // Lokaler Dev-Server: beliebiger Port erlaubt (z. B. wenn 3000 belegt ist
  // und Next.js automatisch auf einen anderen Port ausweicht).
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    return true;
  }

  return erlaubt.some((o) => origin === o || origin.startsWith(`${o}/`));
}

/** SHA-256(IP + Salt) — die Klartext-IP verlässt diese Funktion nie. */
export async function ipHash(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unbekannt';
  const salt = process.env.IP_SALT ?? 'sanierungsrechner-dev-salt';
  return createHash('sha256').update(ip + salt).digest('hex');
}

function supabaseFuerRateLimit() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** In-Memory-Fallback (nur relevant, solange kein Supabase konfiguriert ist oder die RPC ausfällt). */
const speicher = new Map<string, { fenster: number; anzahl: number }>();

function bumpInMemory(hash: string): boolean {
  const fenster = Math.floor(Date.now() / 60_000);
  const eintrag = speicher.get(hash);
  if (!eintrag || eintrag.fenster !== fenster) {
    if (speicher.size > 10_000) speicher.clear();
    speicher.set(hash, { fenster, anzahl: 1 });
    return true;
  }
  eintrag.anzahl += 1;
  return eintrag.anzahl <= RATE_LIMIT_PER_MINUTE;
}

/**
 * Zählt den Request im aktuellen Minutenfenster (Supabase-RPC über den
 * publishable Key). Liefert false, wenn das Limit überschritten ist. Ohne
 * konfiguriertes Supabase oder bei einem RPC-Fehler greift der In-Memory-
 * Zähler, statt den Rechner ganz ungebremst laufen zu lassen.
 */
export async function rateLimitOk(hash: string): Promise<boolean> {
  const supabase = supabaseFuerRateLimit();
  if (!supabase) return bumpInMemory(hash);

  const { data, error } = await supabase.rpc('sanierung_rate_limit_hit', {
    p_ip_hash: hash,
    p_limit: RATE_LIMIT_PER_MINUTE,
  });

  if (error) {
    console.error('Rate Limiting fehlgeschlagen:', error.message);
    return bumpInMemory(hash);
  }
  return data === true;
}

/** Honeypot: das unsichtbare Feld website_url darf nie gefüllt sein. */
export function honeypotAusgeloest(websiteUrl: unknown): boolean {
  return typeof websiteUrl === 'string' && websiteUrl.trim() !== '';
}
