export function HinweiseAccordion() {
  return (
    <details className="print-break-avoid rounded-[20px] border border-black/[0.08] bg-white p-[18px] sm:p-[22px]">
      <summary className="cursor-pointer font-disp text-[15px] font-bold text-ink">
        Rechtsstand &amp; offene Punkte
      </summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-[1.55] text-muted">
        <li>
          Rechtsstand: Richtlinie BEG EM vom 17.07.2026 (Bundesanzeiger-Fassung vom 17.08.2026, BAnz AT 27.08.2026 B1,
          rückwirkend ab 21.07.2026), Richtlinie BEG WG vom 17.07.2026 sowie KfW-Merkblätter 458 und 261 (Stand 07/2026).
          Alle Sätze und Deckel wurden am 05.09.2026 gegen diese Primärquellen geprüft.
        </li>
        <li>
          Geschwindigkeitsbonus (16 Prozentpunkte) und Höchstgrenze der 1. Wohneinheit (28.000 €) sinken ab 01.02.2027
          halbjährlich (bis 0 Prozentpunkte ab 01.08.2028 bzw. 22.000 € ab 01.08.2030) — maßgeblich ist der Antragseingang,
          deshalb das Feld &bdquo;Antragsdatum&ldquo; in Karte 2.
        </li>
        <li>Der WPB-Bonus (+5 Prozentpunkte) für Dämmmaßnahmen an der Gebäudehülle gilt erst für Anträge ab Q1/2027 und ist hier nicht angesetzt.</li>
        <li>
          Ab Q1/2027 sinkt die Grundförderung für Wärmepumpen auf 15 %; die vollen 30 % gibt es dann nur mit dem
          Wertschöpfungsbonus für Geräte mit Ursprung in der EU (Herkunftskriterien folgen per BMWE-Infoblatt) — hier nicht angesetzt.
        </li>
        <li>
          BEG-Einzelmaßnahmen und Effizienzhaus-Förderung KfW 261 sind für dieselbe Maßnahme nicht kombinierbar (RL BEG EM Nr. 8.6).
          Eine früher berichtete 3-Jahres-Sperrfrist steht in keiner Richtlinie.
        </li>
        <li>Der SerSan-Bonus für EH 70 EE (+5 Prozentpunkte) ist laut KfW voraussichtlich erst ab Ende September 2026 beantragbar — im Ergebnis nur als Hinweis.</li>
      </ul>
    </details>
  );
}
