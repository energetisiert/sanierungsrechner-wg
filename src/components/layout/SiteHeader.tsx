import Image from 'next/image';

/**
 * Sticky Kopfzeile, 1:1 nach dem Vorbild von Heizlast-, Förder- und
 * CO2-Rechner (gleiches Logo, gleicher Ruecksprung-Link als Pille rechts).
 */
export function SiteHeader() {
  return (
    <header
      className="no-print sticky top-0 z-[60] border-b border-black/[0.07] backdrop-blur-md"
      style={{ background: '#fbfbfaeb' }}
    >
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3.5 px-4 sm:h-16 sm:px-7">
        <a href="https://tools.energetisiert.de/hub" aria-label="Zur Tool-Uebersicht">
          <Image src="/energetisiert-logo.png" alt="energetisiert." width={154} height={20} priority className="block h-5 w-auto sm:h-6" />
        </a>
        <a
          href="https://tools.energetisiert.de/hub"
          className="ml-auto inline-flex min-h-8 flex-none items-center gap-1 rounded-full border border-black/[0.12] px-[11px] py-[7px] text-[11.5px] font-semibold text-ink no-underline transition-colors hover:border-ac hover:text-ac sm:min-h-9 sm:px-[18px] sm:py-[9px] sm:text-[13.5px]"
        >
          Zurück zum Hub<span aria-hidden="true">→</span>
        </a>
      </div>
    </header>
  );
}
