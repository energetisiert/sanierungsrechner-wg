export function HinweiseAccordion() {
  return (
    <details className="print-break-avoid rounded-[20px] border border-black/[0.08] bg-white p-[18px] sm:p-[22px]">
      <summary className="cursor-pointer font-disp text-[15px] font-bold text-ink">
        Bekannte Unsicherheiten &amp; offene Punkte
      </summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-[1.55] text-muted">
        <li>
          Die finale BEG-Richtlinie ist noch nicht im Bundesanzeiger veröffentlicht. Alle Sätze und Deckel basieren auf
          BAFA-Merkblättern, dem KfW-Merkblatt 261 und Fachportalen, Stand Juli/August 2026 — vor einer Antragstellung gegen die dann
          veröffentlichte Förderrichtlinie gegenprüfen.
        </li>
        <li>Der WPB-Bonus für Einzelmaßnahmen an der Gebäudehülle (Variante A) ist erst ab Q1/2027 angekündigt und hier nicht angesetzt.</li>
        <li>Der Wertschöpfungsbonus für EU-Wärmepumpen ist ebenfalls erst ab Q1/2027 angekündigt, die Höhe ist noch offen — nicht implementiert.</li>
        <li>
          Eine vereinzelt berichtete 3-Jahres-Sperrfrist zwischen Einzelmaßnahmen- und Effizienzhausförderung ist nur in einer Quelle
          belegt und hier nicht als Ausschluss umgesetzt — bitte vor verbindlicher Beratung gegen das aktuelle KfW-Merkblatt prüfen.
        </li>
        <li>Die Antragstellung für KfW 261 zu den neuen Konditionen ist voraussichtlich erst ab Ende September 2026 möglich — im Ergebnis nur als Hinweis, nicht als Blocker.</li>
      </ul>
    </details>
  );
}
