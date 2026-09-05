'use client';

/** Leiste über dem Formular, wenn das Tool aus dem Studio mit ?gebaeude=<id> geöffnet wurde. */
export function GebaeudeBanner({
  kundenname, objektadresse, modus, fehler,
}: {
  kundenname?: string;
  objektadresse?: string;
  /** 'geladen' = gespeicherter Stand dieses Tools, 'vorbelegt' = aus den Stammdaten anderer Tools übernommen. */
  modus?: 'geladen' | 'vorbelegt';
  fehler?: string | null;
}) {
  if (fehler) {
    return (
      <div className="no-print mb-5 rounded-2xl border border-red/30 bg-red/[0.05] px-4 py-3 text-[13px] text-red">
        Gebäude aus dem Studio konnte nicht geladen werden: {fehler}
      </div>
    );
  }
  if (!kundenname) return null;
  return (
    <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ac/30 bg-ac/[0.06] px-4 py-3">
      <div className="min-w-0 text-[13px]">
        <span className="font-disp text-[10.5px] font-bold uppercase tracking-[0.12em] text-ac">Gebäude aus dem Studio</span>
        <p className="truncate font-semibold text-ink">
          {kundenname} <span className="font-normal text-muted">· {objektadresse}</span>
        </p>
        <p className="text-[12px] text-muted">
          {modus === 'geladen'
            ? 'Gespeicherter Stand dieses Tools geladen. „Im Gebäude speichern“ aktualisiert ihn.'
            : 'Aus den Stammdaten des Gebäudes vorbelegt (andere Felder auf Standard). Beim Speichern wird das Gebäude ergänzt.'}
        </p>
      </div>
      <a href="https://tools.energetisiert.de/hub" className="text-[12.5px] font-semibold text-ac hover:underline">
        Zurück zum Hub →
      </a>
    </div>
  );
}
