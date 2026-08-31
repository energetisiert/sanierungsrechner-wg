'use server';

import { checkBotId } from 'botid/server';
import { berechneSanierung, berechneWirtschaftlichkeit } from '@/lib/calculator/engine';
import type {
  LiegenschaftInput,
  SanierungsErgebnis,
  WirtschaftlichkeitEingabe,
  WirtschaftlichkeitErgebnis,
} from '@/lib/calculator/types';
import { honeypotAusgeloest, ipHash, origenErlaubt, rateLimitOk } from '@/lib/security/guards';
import { issueToken, verifyToken } from '@/lib/security/token';

export type BerechnungResponse =
  | { status: 'blocked' }
  | { status: 'token' }
  | { status: 'ok'; ergebnis: SanierungsErgebnis; wirtschaftlichkeit: WirtschaftlichkeitErgebnis };

/**
 * Einziger Ort, an dem engine.ts aufgerufen wird. Fördersätze, Deckel-
 * Staffeln und Degressionen verlassen den Server nie — der Client bekommt
 * ausschließlich das fertige Ergebnisobjekt (nur angezeigte Werte).
 *
 * Reihenfolge der Schutzschichten (identisch zum CO2-Aufteilungsrechner und
 * zum Gebäudeabgrenzungsrechner):
 *   Honeypot → Origin → Token → BotID → Rate Limit → rechnen.
 * 'token' meldet ein abgelaufenes oder fehlendes Token — der Client fordert
 * einmalig ein frisches an (BotID-geprüft) und wiederholt die Berechnung,
 * statt dass eine Sitzung nach der TTL hart fehlschlägt. Alle anderen
 * Ablehnungen antworten einheitlich mit 'blocked', ohne den Grund zu
 * verraten, damit Bots nicht nachjustieren können.
 */
export async function berechneSanierungAction(
  input: LiegenschaftInput,
  wirtschaftlichkeit: WirtschaftlichkeitEingabe,
  token: string,
  websiteUrl?: string,
): Promise<BerechnungResponse> {
  if (honeypotAusgeloest(websiteUrl)) {
    return { status: 'blocked' };
  }

  if (!(await origenErlaubt())) {
    return { status: 'blocked' };
  }

  const tokenStatus = verifyToken(token);
  if (tokenStatus !== 'ok') {
    return { status: 'token' };
  }

  const botCheck = await checkBotId({ advancedOptions: { checkLevel: 'basic' } });
  if (botCheck.isBot) {
    return { status: 'blocked' };
  }

  if (!(await rateLimitOk(await ipHash()))) {
    return { status: 'blocked' };
  }

  const ergebnis = berechneSanierung(input);
  const eigenanteil = Math.max(input.kostenNetto - ergebnis.bestesFoerderErgebnis, 0);

  return {
    status: 'ok',
    ergebnis,
    wirtschaftlichkeit: berechneWirtschaftlichkeit({ ...wirtschaftlichkeit, eigenanteil }),
  };
}

/** Frisches Request-Token, z. B. nach Ablauf der Gültigkeit. */
export async function holeToken(): Promise<string | null> {
  const botCheck = await checkBotId({ advancedOptions: { checkLevel: 'basic' } });
  if (botCheck.isBot || !(await origenErlaubt())) return null;
  return issueToken();
}
