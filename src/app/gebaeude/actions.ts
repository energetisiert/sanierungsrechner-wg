'use server';

import { origenErlaubt } from '@/lib/security/guards';
import { createClient } from '@/lib/supabase/server';
import type { GebaeudeDetail, GebaeudeEintrag, GebaeudeStammdaten } from '@/lib/gebaeude/stammdaten';

/**
 * Studio-Gebäudemodell (Phase 2) -- Server Actions statt Route Handler (Muster
 * dieses Tools). Serverseitiger Supabase-Client liest die httpOnly-SSO-Cookie;
 * auth.uid() in den gebaeude_*-RPCs ist der eigentliche Auth-Schutz, der
 * Origin-Check die zweite Schicht. Ein Gebäude wird einmal angelegt, dieses
 * Tool hängt seinen Eingabezustand als Knoten daran (ein Knoten je Tool, wird
 * ersetzt) und mischt seine Stammdaten-Felder ein (jsonb ||).
 */
const TOOL_SLUG = 'sanierungsrechner';
const MAX_TEXT = 300;
const ZUGRIFF_VERWEIGERT = { fehler: 'Zugriff verweigert.' } as const;



export interface ImGebaeudeSpeichern {
  gebaeudeId?: string;
  kundenname?: string;
  objektadresse?: string;
  stammdaten: Partial<GebaeudeStammdaten>;
  eingaben: unknown;
  ergebnis: Record<string, unknown>;
}

const istObjekt = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
const istUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

export async function gebaeudeListeAction(): Promise<{ gebaeude: GebaeudeEintrag[] } | { fehler: string }> {
  if (!(await origenErlaubt())) return ZUGRIFF_VERWEIGERT;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('gebaeude_list');
  if (error) return { fehler: error.message };
  return { gebaeude: (data ?? []) as GebaeudeEintrag[] };
}

export async function gebaeudeHolenAction(id: unknown): Promise<{ detail: GebaeudeDetail } | { fehler: string }> {
  if (!(await origenErlaubt())) return ZUGRIFF_VERWEIGERT;
  if (!istUuid(id)) return { fehler: 'Ungültige ID.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('gebaeude_get', { p_id: id });
  if (error) return { fehler: error.message };
  return { detail: data as GebaeudeDetail };
}

export async function imGebaeudeSpeichernAction(
  daten: ImGebaeudeSpeichern,
): Promise<{ gebaeudeId: string; knotenId: string } | { fehler: string }> {
  if (!(await origenErlaubt())) return ZUGRIFF_VERWEIGERT;
  if (!istObjekt(daten) || !istObjekt(daten.eingaben) || !istObjekt(daten.stammdaten ?? {}) || !istObjekt(daten.ergebnis ?? {})) {
    return { fehler: 'Ungültiges Format.' };
  }
  const hatId = istUuid(daten.gebaeudeId);
  if (!hatId) {
    const k = typeof daten.kundenname === 'string' ? daten.kundenname.trim() : '';
    const a = typeof daten.objektadresse === 'string' ? daten.objektadresse.trim() : '';
    if (!k || !a || k.length > MAX_TEXT || a.length > MAX_TEXT) {
      return { fehler: 'Bitte Kundenname und Objektadresse angeben (max. 300 Zeichen).' };
    }
  }
  const supabase = await createClient();
  const { data: gebaeudeId, error: fehlerGebaeude } = await supabase.rpc('gebaeude_upsert', {
    p_id: hatId ? daten.gebaeudeId : null,
    p_kundenname: hatId ? null : daten.kundenname!.trim(),
    p_objektadresse: hatId ? null : daten.objektadresse!.trim(),
    p_stammdaten: daten.stammdaten ?? {},
  });
  if (fehlerGebaeude) return { fehler: fehlerGebaeude.message };
  const { data: knotenId, error: fehlerKnoten } = await supabase.rpc('gebaeude_knoten_upsert', {
    p_gebaeude_id: gebaeudeId,
    p_tool_slug: TOOL_SLUG,
    p_eingaben: daten.eingaben,
    p_ergebnis: daten.ergebnis ?? {},
  });
  if (fehlerKnoten) return { fehler: fehlerKnoten.message };
  return { gebaeudeId: gebaeudeId as string, knotenId: knotenId as string };
}

export async function gebaeudeLoeschenAction(id: unknown): Promise<{ ok: true } | { fehler: string }> {
  if (!(await origenErlaubt())) return ZUGRIFF_VERWEIGERT;
  if (!istUuid(id)) return { fehler: 'Ungültige ID.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('gebaeude_delete', { p_id: id });
  if (error) return { fehler: error.message };
  return { ok: true };
}

export async function knotenLoeschenAction(id: unknown): Promise<{ ok: true } | { fehler: string }> {
  if (!(await origenErlaubt())) return ZUGRIFF_VERWEIGERT;
  if (!istUuid(id)) return { fehler: 'Ungültige ID.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('gebaeude_knoten_delete', { p_id: id });
  if (error) return { fehler: error.message };
  return { ok: true };
}
