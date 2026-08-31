import { RechnerClient } from '@/components/rechner/RechnerClient';
import { issueToken } from '@/lib/security/token';

/** Tokens sind zeitgebunden — die Seite darf nicht statisch vorgerendert werden. */
export const dynamic = 'force-dynamic';

export default function RechnerPage() {
  /* Kurzlebiges, signiertes Request-Token — wird von der Server Action bei
     jeder Berechnung verlangt und mit der Antwort erneuert. */
  const token = issueToken();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:pb-10">
      <header className="no-print mb-10">
        <h1 className="font-disp text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-ink">Sanierungsrechner WG</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Sanierungskosten grob schätzen und die günstigste Förderung finden: BEG-Einzelmaßnahmen, KfW 458, KfW 261 und Steuerbonus
          § 35c im direkten Vergleich — inklusive Kostenschätzung nach Gewerken und Amortisationsrechnung.
        </p>
      </header>
      <RechnerClient initialToken={token} />
    </main>
  );
}
