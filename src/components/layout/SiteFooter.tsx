/**
 * Rechtlicher Hinweis, nach dem Vorbild von Heizlast-, Förder- und
 * CO2-Rechner. Impressum und Datenschutz verweisen direkt auf die zentralen
 * Seiten der Hauptdomain (Vorgabe aus dem Security-/Legal-Briefing).
 */
export function SiteFooter() {
  return (
    <div className="fuss mx-auto max-w-[1180px] px-4 pt-2.5 pb-[26px] sm:px-7 sm:pb-[30px]">
      <p className="text-[11.5px] leading-[1.6] text-muted2">
        Überschlägige Berechnung nach den öffentlichen Förderrichtlinien von BAFA, KfW und BMF (Rechtsstand siehe
        Ergebnis). Keine Gewähr sowie keine Rechts- oder Steuerberatung. ©{' '}
        <strong className="text-muted">energetisiert. energieberatung GmbH</strong>
      </p>
      <div className="no-print mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <a
          href="https://energetisiert.de/datenschutz/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] text-muted2 underline decoration-muted2/50 underline-offset-2 hover:text-muted"
        >
          Datenschutz
        </a>
        <a
          href="https://energetisiert.de/impressum/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] text-muted2 underline decoration-muted2/50 underline-offset-2 hover:text-muted"
        >
          Impressum
        </a>
      </div>
    </div>
  );
}
