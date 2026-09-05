'use server';

import { createClient } from '@/lib/supabase/server';
import { origenErlaubt } from '@/lib/security/guards';

/**
 * "Gespeicherte Gebäude" -- Server Actions statt Route Handler (Muster dieses
 * Tools, vgl. app/rechner/actions.ts). Läuft über den serverseitigen
 * Supabase-Client, der die httpOnly-SSO-Cookie liest -- ein Browser-Client
 * hätte darauf keinen Zugriff und würde jede RPC anonym absenden.
 * auth.uid() in den saved_results_*-RPCs ist der eigentliche Auth-Schutz;
 * der Origin-Check ist die zweite Schicht wie bei der Berechnungs-Action.
 * Kein BotID/Request-Token: die RPCs verlangen eine eingeloggte Session,
 * anonyme Aufrufe scheitern serverseitig.
 */
const TOOL_SLUG = 'sanierungsrechner';
const MAX_TEXT = 200;

export interface GespeichertesErgebnis {
  id: string;
  kundenname: string;
  objektadresse: string;
  payload: unknown;
  created_at: string;
}

export type ListeAntwort = { ergebnisse: GespeichertesErgebnis[] } | { fehler: string };
export type SpeichernAntwort = { id: string } | { fehler: string };
export type LoeschenAntwort = { ok: true } | { fehler: string };

const ZUGRIFF_VERWEIGERT = { fehler: 'Zugriff verweigert.' } as const;

export async function gespeicherteLadenAction(): Promise<ListeAntwort> {
  if (!(await origenErlaubt())) return ZUGRIFF_VERWEIGERT;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('saved_results_list', { p_tool_slug: TOOL_SLUG });
  if (error) return { fehler: error.message };
  return { ergebnisse: (data ?? []) as GespeichertesErgebnis[] };
}

export async function gespeichertesSpeichernAction(
  kundenname: unknown,
  objektadresse: unknown,
  payload: unknown,
): Promise<SpeichernAntwort> {
  if (!(await origenErlaubt())) return ZUGRIFF_VERWEIGERT;
  if (
    typeof kundenname !== 'string' ||
    typeof objektadresse !== 'string' ||
    !kundenname.trim() ||
    !objektadresse.trim() ||
    kundenname.length > MAX_TEXT ||
    objektadresse.length > MAX_TEXT
  ) {
    return { fehler: 'Bitte Kundenname und Objektadresse angeben (max. 200 Zeichen).' };
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { fehler: 'Ungültiges Format.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('saved_results_create', {
    p_tool_slug: TOOL_SLUG,
    p_kundenname: kundenname.trim(),
    p_objektadresse: objektadresse.trim(),
    p_payload: payload,
  });
  if (error) return { fehler: error.message };
  return { id: data as string };
}

export async function gespeichertesLoeschenAction(id: unknown): Promise<LoeschenAntwort> {
  if (!(await origenErlaubt())) return ZUGRIFF_VERWEIGERT;
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return { fehler: 'Ungültige ID.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('saved_results_delete', { p_id: id });
  if (error) return { fehler: error.message };
  return { ok: true };
}
