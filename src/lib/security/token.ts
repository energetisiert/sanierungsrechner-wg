import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/*
 * Kurzlebige, signierte Request-Tokens (HMAC-SHA256). Das Token wird beim
 * Rendern der Rechnerseite serverseitig ausgestellt und muss bei jeder
 * Berechnung mitgeschickt werden — automatisierte Direktaufrufe der Action
 * ohne vorherigen Seitenaufruf scheitern daran.
 *
 * REQUEST_TOKEN_SECRET sollte in Produktion gesetzt sein; ohne Env-Variable
 * wird pro Serverinstanz ein zufälliges Secret erzeugt (für lokale Entwicklung
 * ausreichend, bei mehreren Serverless-Instanzen fordert der Client bei einer
 * Signatur-Abweichung einfach ein frisches Token an).
 *
 * Identisches Muster wie im CO2-Aufteilungsrechner und im Gebäudeabgrenzungs-
 * rechner (src/lib/security/token.ts), damit die Anti-Scraping-Schicht über
 * alle Tools hinweg einheitlich ist.
 */

const SECRET = process.env.REQUEST_TOKEN_SECRET ?? randomBytes(32).toString('hex');
const TTL_MS = 10 * 60 * 1000;

function signatur(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function issueToken(): string {
  const payload = `${Date.now()}.${randomBytes(8).toString('hex')}`;
  return `${payload}.${signatur(payload)}`;
}

export type TokenStatus = 'ok' | 'abgelaufen' | 'ungueltig';

export function verifyToken(token: string | undefined | null): TokenStatus {
  if (!token) return 'ungueltig';
  const teile = token.split('.');
  if (teile.length !== 3) return 'ungueltig';
  const [ts, nonce, sig] = teile;
  const erwartet = signatur(`${ts}.${nonce}`);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(erwartet, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return 'ungueltig';
  const alter = Date.now() - Number(ts);
  if (!Number.isFinite(alter) || alter < 0 || alter > TTL_MS) return 'abgelaufen';
  return 'ok';
}
