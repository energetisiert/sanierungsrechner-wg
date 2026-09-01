import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
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
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const host = request.headers.get('host')?.split(':')[0];

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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt).*)'],
};
