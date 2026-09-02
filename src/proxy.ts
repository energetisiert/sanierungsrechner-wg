import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hatSsoSessionCookie, rpcRateLimitUeberschritten } from '@/lib/security/proxy-guard';
import { ausCacheLesen, inCacheSchreiben } from '@/lib/security/zugriffs-cache';
import { ssoCookieOptions } from '@/lib/supabase/cookie-options';
import type { Zugriffsstatus } from '@/lib/supabase/zugriffsstatus';

const TOOL_SLUG = 'sanierungsrechner';
const HUB_URL = 'https://tools.energetisiert.de';

/**
 * Zugriffskontrolle vor jeder Seite dieses Tools: Session vorhanden? Konto
 * freigeschaltet? Enthaelt das gebuchte Paket dieses Tool? Sonst Redirect
 * zum Hub. Live-Pruefung per RPC (zugriffsstatus(), im gemeinsamen
 * Supabase-Projekt "foerderrechner") -- NICHT der JWT-Claim aus dem Custom
 * Access Token Hook, der bis zu ~1h veraltet sein kann. Ein
 * Middleware-Redirect IST Datenzugriffskontrolle, hier gilt dieselbe Regel
 * wie fuer RLS: immer live pruefen, nie dem Claim vertrauen.
 */
function antwortAusZustand(zustand: Zugriffsstatus | null, request: NextRequest, response: NextResponse): NextResponse {
  if (!zustand || zustand.status === 'anonym') {
    return NextResponse.redirect(`${HUB_URL}/login?redirect_to=${encodeURIComponent(request.url)}`);
  }
  if (zustand.status !== 'approved') {
    return NextResponse.redirect(`${HUB_URL}/warten-auf-freischaltung`);
  }
  if (!zustand.hat_zugriff) {
    return NextResponse.redirect(`${HUB_URL}/kein-zugriff?tool=${TOOL_SLUG}`);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0];

  if (!hatSsoSessionCookie(request)) {
    return NextResponse.redirect(`${HUB_URL}/login?redirect_to=${encodeURIComponent(request.url)}`);
  }
  if (rpcRateLimitUeberschritten(request)) {
    return new NextResponse('Zu viele Anfragen.', { status: 429 });
  }

  // Live-Rechner ohne Berechnen-Knopf: bei aktivem Tippen ruft jede 250ms
  // Eingabepause diese Middleware erneut auf. Ein kurzlebiger Cache (5s)
  // erspart der geteilten Datenbank die immer gleiche Antwort mehrmals pro
  // Sekunde -- eine echte Sperrung/Paketaenderung greift trotzdem innerhalb
  // weniger Sekunden, nicht erst nach der bis zu 1h alten JWT-Claim-Frist.
  const gecached = await ausCacheLesen(request);
  if (gecached !== undefined) {
    return antwortAusZustand(gecached, request, NextResponse.next({ request }));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: ssoCookieOptions(host),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data, error } = await supabase.rpc('zugriffsstatus', { p_tool_slug: TOOL_SLUG });
  if (error) {
    console.error('Middleware: zugriffsstatus fehlgeschlagen:', error.message);
    return NextResponse.redirect(`${HUB_URL}/login?redirect_to=${encodeURIComponent(request.url)}`);
  }

  const zustand = data as Zugriffsstatus | null;
  // Fehlerfaelle bewusst nicht cachen -- ein transienter RPC-Fehler soll
  // nicht fuer 5s als "kein Zugriff" haengenbleiben, der naechste Request
  // versucht es einfach live erneut.
  await inCacheSchreiben(request, zustand);
  return antwortAusZustand(zustand, request, response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
