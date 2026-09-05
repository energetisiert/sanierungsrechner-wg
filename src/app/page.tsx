import { redirect } from 'next/navigation';

/**
 * Startseite leitet auf den Rechner weiter -- und reicht dabei den Studio-
 * Parameter ?gebaeude=<id> durch (Sprung aus dem Tools Hub auf die Tool-Root-
 * URL), sonst ginge der Gebaeudekontext bei der Weiterleitung verloren.
 */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const gebaeude = typeof sp.gebaeude === 'string' && /^[0-9a-f-]{36}$/i.test(sp.gebaeude) ? sp.gebaeude : null;
  redirect(gebaeude ? `/rechner?gebaeude=${encodeURIComponent(gebaeude)}` : '/rechner');
}
