import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase-Client für Server Components, Server Actions und Route Handler.
 * Muss pro Request neu erzeugt werden (Cookies sind request-gebunden). Liest
 * die geteilte httpOnly-SSO-Cookie (siehe cookie-options.ts) -- damit laufen
 * die saved_results_*-RPCs mit auth.uid() des eingeloggten Nutzers. Beide
 * Namen für den public key werden akzeptiert, einheitlich mit den
 * Schwester-Tools (Vorlage: Förderrechner src/lib/supabase/server.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll wird auch aus Server Components aufgerufen, die keine Cookies
          // schreiben dürfen — das ist unkritisch, solange proxy.ts die
          // Session pro Request auffrischt.
        }
      },
    },
  });
}
