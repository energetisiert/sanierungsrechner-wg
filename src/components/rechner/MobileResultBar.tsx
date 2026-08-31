'use client';

import type { SanierungsErgebnis } from '@/lib/calculator/types';

function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

export function MobileResultBar({ ergebnis, blocked }: { ergebnis: SanierungsErgebnis | null; blocked: boolean }) {
  if (blocked || !ergebnis) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-black/10 bg-dark px-4 py-3 lg:hidden">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-dark-label">Beste Förderung</p>
        <p className="tabular-nums text-[17px] font-extrabold text-white">{formatEuro(ergebnis.bestesFoerderErgebnis)}</p>
      </div>
      <a
        href="#ergebnis"
        className="rounded-full bg-mint px-4 py-2 text-[13px] font-semibold text-dark no-underline"
      >
        Details
      </a>
    </div>
  );
}
