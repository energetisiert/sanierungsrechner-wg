import Image from 'next/image';
import type { EmpfohleneVariante, SanierungsErgebnis, WirtschaftlichkeitErgebnis } from '@/lib/calculator/types';
import { toInput, toWirtschaftlichkeitEingabe, type FormState } from './formstate';

function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

function formatProzent(n: number, digits = 0): string {
  return (n * 100).toLocaleString('de-DE', { maximumFractionDigits: digits }) + ' %';
}

function formatJahre(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Jahre';
}

const VARIANTEN_NAME: Record<EmpfohleneVariante, string> = {
  A: 'BEG Einzelmaßnahmen',
  B: 'KfW 261 Effizienzhaus',
  C: 'Steuerbonus § 35c',
};

/**
 * Druckausgabe, nur im Druck sichtbar (hidden print:block) — die interaktive
 * Oberfläche wird über .no-print in globals.css ausgeblendet. Struktur und
 * Gestaltung 1:1 nach dem unternehmensweiten PDF-Template (Vorlagen/
 * energetisiert_tool_pdf_template.html): Kopfzeile mit Eyebrow + Trennlinie,
 * Tool-Eyebrow, H1, Meta-Streifen, dunkles Ergebnispanel, Eingaben-Tabelle,
 * Rechenweg, nächste Schritte, Rechtshinweis-Box, Fußzeile. Gleiches Muster
 * wie im Heizlast-/Förder-/CO2-Rechner, mit denselben Farb-Tokens aus
 * globals.css (--color-ac/--color-doc/... bzw. deren Tailwind-Utilities).
 */
export function PrintReport({
  form,
  ergebnis,
  wirtschaftlichkeit,
}: {
  form: FormState;
  ergebnis: SanierungsErgebnis;
  wirtschaftlichkeit: WirtschaftlichkeitErgebnis;
}) {
  const input = toInput(form);
  const wirtschaftlichkeitEingabe = toWirtschaftlichkeitEingabe(form);
  const selbstnutzend = form.antrag === 'Privatperson (selbstnutzend)';
  const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const eigenanteil = Math.max(input.kostenNetto - ergebnis.bestesFoerderErgebnis, 0);
  const amortBekannt = Number.isFinite(wirtschaftlichkeit.amortStatischJahre);

  // Nur Boni, die im Formular für diese Konstellation tatsächlich sichtbar
  // und angehakt sind (gleiche Sichtbarkeitsregeln wie FoerderprofilCard) —
  // keine Bonus-Labels, die ohne Wirkung wären.
  const boni = [
    form.isfp && 'Individueller Sanierungsfahrplan (iSFP)',
    selbstnutzend && form.klima && 'Klimageschwindigkeitsbonus',
    !form.neu && form.effizienz && 'Effizienzbonus',
    form.wpb && 'Worst-Performing-Building-Bonus',
    form.sersan && 'Serielle Sanierung',
    form.eeklasse && 'Erneuerbare-Energien-Klasse',
    form.nhklasse && 'Nachhaltigkeits-Klasse NH/QNG',
    form.kombi458 && 'Heizungstausch im 261-Antrag kombiniert',
  ].filter((x): x is string => Boolean(x));

  const eingaben = [
    { label: 'Rechtsstand', wert: form.neu ? 'BEG-Reform ab 21.07.2026' : 'Rechtsstand ALT' },
    { label: 'Wohneinheiten', wert: `${input.we} ${input.we === 1 ? 'Wohneinheit' : 'Wohneinheiten'}` },
    { label: 'Antragsteller', wert: form.antrag },
    { label: 'Ziel-Effizienzhaus-Stufe', wert: form.ehstufe },
    boni.length > 0 && { label: 'Ausgewählte Boni', wert: boni.join(', ') },
    selbstnutzend && input.zve > 0 && { label: 'Zu versteuerndes Haushaltseinkommen', wert: formatEuro(input.zve) },
    selbstnutzend && input.kinder > 0 && { label: 'Kinder im Haushalt (< 18 Jahre)', wert: String(input.kinder) },
    { label: 'Kosten Gebäudehülle', wert: formatEuro(input.kostenHuelle) },
    { label: 'Kosten Heizungstausch', wert: formatEuro(input.kostenHeizung) },
    { label: 'Kosten Umfeldmaßnahmen Heizung', wert: formatEuro(input.kostenUmfeld) },
    { label: 'Kosten Lüftungsanlage', wert: formatEuro(input.kostenLueftung) },
    { label: 'Kosten individueller Sanierungsfahrplan', wert: formatEuro(input.kostenIsfp) },
    { label: 'Kosten Planung & Baubegleitung', wert: formatEuro(input.kostenPlanung) },
    { label: 'Gesamtkosten netto', wert: formatEuro(input.kostenNetto) },
    input.ausl35c > 0 && { label: 'davon für § 35c ausgewiesen', wert: formatEuro(input.ausl35c) },
    wirtschaftlichkeitEingabe.jaehrlicheEinsparung > 0 && {
      label: 'Jährliche Einsparung (geschätzt)',
      wert: formatEuro(wirtschaftlichkeitEingabe.jaehrlicheEinsparung),
    },
    wirtschaftlichkeitEingabe.jaehrlicheEinsparung > 0 && {
      label: 'Energiepreissteigerung p. a.',
      wert: formatProzent(wirtschaftlichkeitEingabe.preissteigerung, 1),
    },
    wirtschaftlichkeitEingabe.jaehrlicheEinsparung > 0 && {
      label: 'Kalkulationszins p. a.',
      wert: formatProzent(wirtschaftlichkeitEingabe.kapitalzins, 1),
    },
  ].filter((z): z is { label: string; wert: string } => Boolean(z));

  // Nächste Schritte: nur Schritte, die aus der Variante A/B/C-Logik (BEG/
  // KfW/§ 35c) tatsächlich folgen — § 35c braucht z. B. gerade KEINEN
  // vorherigen Förderantrag, anders als BEG EM/KfW 261/458.
  const schritt2 =
    ergebnis.empfohleneVariante === 'C'
      ? {
          titel: 'Keine Vorab-Antragstellung nötig.',
          text: 'Der Steuerbonus § 35c wird erst mit der Steuererklärung nach Fertigstellung geltend gemacht — ohne Bewilligungsverfahren vor Auftragsvergabe.',
        }
      : {
          titel: 'Förderantrag vor Auftragsvergabe stellen.',
          text: `Bei ${VARIANTEN_NAME[ergebnis.empfohleneVariante]} muss der Antrag gestellt bzw. bewilligt sein, bevor der Handwerksbetrieb beauftragt wird — sonst entfällt die Förderfähigkeit.`,
        };
  const schritt3 =
    input.kostenHeizung > 0 || input.kostenUmfeld > 0
      ? {
          titel: 'Hydraulischen Abgleich einplanen.',
          text: 'Er ist Fördervoraussetzung für den Heizungstausch (KfW 458) und zählt zu den anerkannten Umfeldmaßnahmen.',
        }
      : {
          titel: 'Fachunternehmererklärung und Verwendungsnachweis vorbereiten.',
          text: 'Beide sind Voraussetzung für die Auszahlung von Zuschuss bzw. Tilgungszuschuss nach Fertigstellung.',
        };
  const schritte = [
    {
      titel: 'Fachunternehmerangebote einholen.',
      text: 'Sie sind Grundlage für den tatsächlichen Kostenansatz und für die Fachunternehmererklärung, unabhängig von der gewählten Variante.',
    },
    schritt2,
    schritt3,
  ];

  return (
    <div className="hidden print:block">
      {/* Kopfzeile: Logo + Eyebrow + Trennlinie, wie im unternehmensweiten PDF-Template. */}
      <div className="flex items-end justify-between gap-4">
        <Image src="/energetisiert-logo.png" alt="energetisiert." width={154} height={20} className="h-5 w-auto" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted2">Auswertung · Tool-Ergebnis</span>
      </div>
      <div className="mt-2 h-[3px] rounded-full bg-doc" />

      <p className="font-disp mt-5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ac">Sanierungsrechner WG</p>
      <h1 className="font-disp mt-1 text-[22px] font-extrabold tracking-tight text-doc">Ihre Auswertung im Überblick</h1>
      <p className="mt-2 max-w-[58ch] text-[11.5px] leading-[1.55] text-muted">
        Diese Auswertung wurde am {heute} aus Ihren Angaben berechnet und ersetzt keine rechtsverbindliche Förderprüfung oder
        Beratung vor Ort.
      </p>

      {/* Meta-Streifen: nur Felder, die dieser Rechner tatsächlich erhebt — kein Objekt/Referenz/Erstellt-von. */}
      <div className="print-break-avoid mt-5 grid grid-cols-3 overflow-hidden rounded-[14px] border border-black/[0.08]">
        <div className="border-r border-black/10 px-3 py-2.5">
          <span className="block text-[7.5px] font-semibold uppercase tracking-[0.11em] text-muted2">Wohneinheiten</span>
          <b className="font-disp text-[11px] font-bold text-ink">{input.we}</b>
        </div>
        <div className="border-r border-black/10 px-3 py-2.5">
          <span className="block text-[7.5px] font-semibold uppercase tracking-[0.11em] text-muted2">Rechtsstand</span>
          <b className="font-disp text-[11px] font-bold text-ink">{form.neu ? 'BEG-Reform NEU' : 'ALT'}</b>
        </div>
        <div className="px-3 py-2.5">
          <span className="block text-[7.5px] font-semibold uppercase tracking-[0.11em] text-muted2">Stand</span>
          <b className="font-disp text-[11px] font-bold text-ink">{heute}</b>
        </div>
      </div>

      {/* Ergebnispanel: dunkel, wie das Live-Ergebnispanel (ResultPanel.tsx) auf dem Bildschirm. */}
      <div className="print-break-avoid mt-5 rounded-[20px] bg-doc p-5 text-white">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-mint">Ergebnis</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-[14px] bg-white/[0.06] p-3">
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.1em] text-dark-label">
              Beste Förderung ({ergebnis.empfohleneVariante})
            </div>
            <div className="font-disp mt-1 text-[22px] font-extrabold leading-none tabular-nums text-mint">
              {formatEuro(ergebnis.bestesFoerderErgebnis)}
            </div>
          </div>
          <div className="rounded-[14px] bg-white/[0.06] p-3">
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.1em] text-dark-label">Förderquote</div>
            <div className="font-disp mt-1 text-[22px] font-extrabold leading-none tabular-nums text-warm">
              {formatProzent(ergebnis.foerderquote)}
            </div>
          </div>
        </div>
        <div className="mt-3.5 border-t border-white/10 pt-2.5 text-[10.5px]">
          <div className="flex justify-between gap-3 py-0.5 text-dark-label">
            <span>Gesamtkosten netto</span>
            <b className="font-semibold tabular-nums text-dark-body">{formatEuro(input.kostenNetto)}</b>
          </div>
          <div className="flex justify-between gap-3 py-0.5 text-dark-label">
            <span>Eigenanteil nach Förderung</span>
            <b className="font-semibold tabular-nums text-dark-body">{formatEuro(eigenanteil)}</b>
          </div>
          {amortBekannt && (
            <>
              <div className="flex justify-between gap-3 py-0.5 text-dark-label">
                <span>Amortisation, statisch</span>
                <b className="font-semibold tabular-nums text-dark-body">{formatJahre(wirtschaftlichkeit.amortStatischJahre)}</b>
              </div>
              <div className="flex justify-between gap-3 py-0.5 text-dark-label">
                <span>Amortisation, dynamisch</span>
                <b className="font-semibold tabular-nums text-dark-body">{formatJahre(wirtschaftlichkeit.amortDynamischJahre)}</b>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ihre Eingaben */}
      <h2 className="font-disp mt-6 text-[15px] font-extrabold tracking-tight text-doc">Ihre Eingaben</h2>
      <p className="mt-1 text-[10.5px] leading-[1.5] text-muted">
        Grundlage der Berechnung. Weicht ein Wert von der Realität ab, ändert sich das Ergebnis entsprechend.
      </p>
      <table className="print-break-avoid mt-2.5 w-full border-collapse text-[10.5px]">
        <thead>
          <tr>
            <th className="border-b border-black/10 pb-1.5 pr-2 text-left text-[7.5px] font-semibold uppercase tracking-[0.09em] text-muted2">
              Angabe
            </th>
            <th className="border-b border-black/10 pb-1.5 text-right text-[7.5px] font-semibold uppercase tracking-[0.09em] text-muted2">
              Wert
            </th>
          </tr>
        </thead>
        <tbody>
          {eingaben.map((z) => (
            <tr key={z.label} className="border-b border-black/[0.06]">
              <td className="py-1.5 pr-2 font-semibold text-strong">{z.label}</td>
              <td className="py-1.5 text-right tabular-nums text-muted">{z.wert}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Rechenweg — die bisherige Varianten-Tabelle, stilistisch an die neue Struktur angeglichen. */}
      <h2 className="font-disp mt-6 text-[15px] font-extrabold tracking-tight text-doc">Rechenweg</h2>
      <table className="print-break-avoid mt-2.5 w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="border-b border-black/10 pb-1.5 text-left text-[7.5px] font-semibold uppercase tracking-[0.09em] text-muted2">
              Variante
            </th>
            <th className="border-b border-black/10 pb-1.5 text-right text-[7.5px] font-semibold uppercase tracking-[0.09em] text-muted2">
              Förderergebnis
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black/[0.06]">
            <td className="py-1.5 text-strong">Variante A — BEG Einzelmaßnahmen</td>
            <td className="py-1.5 text-right tabular-nums">{formatEuro(ergebnis.varianteA)}</td>
          </tr>
          <tr className="border-b border-black/[0.06]">
            <td className="py-1.5 text-strong">Variante B — KfW 261 Effizienzhaus</td>
            <td className="py-1.5 text-right tabular-nums">{formatEuro(ergebnis.varianteB.gesamt)}</td>
          </tr>
          <tr className="border-b border-black/[0.06]">
            <td className="py-1.5 text-strong">Variante C — Steuerbonus § 35c</td>
            <td className="py-1.5 text-right tabular-nums">{formatEuro(ergebnis.varianteC)}</td>
          </tr>
          <tr>
            <td className="py-2 font-bold text-doc">Beste Variante ({ergebnis.empfohleneVariante})</td>
            <td className="py-2 text-right tabular-nums font-bold text-doc">{formatEuro(ergebnis.bestesFoerderErgebnis)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[10.5px] leading-[1.5] text-muted">{ergebnis.status.txt}</p>

      {/* Einordnung (Das spricht dafür / Das ist noch offen) bewusst ausgelassen: die Engine liefert nur einen
          einzelnen kombinierten Status-Text (status.ok/txt), keine getrennten Pro-/Offen-Listen — eine Aufteilung
          in zwei Spalten wäre erfunden statt aus echten Rechendaten abgeleitet. */}

      {/* Nächste Schritte */}
      <h2 className="font-disp mt-6 text-[15px] font-extrabold tracking-tight text-doc">Nächste Schritte</h2>
      <div className="print-break-avoid mt-2.5 flex flex-col gap-2">
        {schritte.map((s, i) => (
          <div key={s.titel} className="flex items-start gap-2.5">
            <span className="font-disp flex h-[16px] w-[16px] flex-none items-center justify-center rounded-[5px] bg-ink text-[8px] font-extrabold text-white">
              {i + 1}
            </span>
            <p className="text-[10.5px] leading-[1.5] text-strong">
              <b className="font-semibold">{s.titel}</b> {s.text}
            </p>
          </div>
        ))}
      </div>

      {/* Rechtlicher Hinweis — Kernsatz wortgleich aus SiteFooter.tsx übernommen und um den bestehenden
          Unsicherheits-Hinweis aus HinweiseAccordion.tsx erweitert, statt sich allein auf die Fußzeile zu verlassen. */}
      <div className="print-break-avoid mt-6 rounded-xl bg-tint p-3.5 text-[9px] leading-[1.55] text-muted">
        <b className="font-semibold text-strong">Rechtlicher Hinweis.</b> Überschlägige Berechnung nach den öffentlichen
        Förderrichtlinien von BAFA, KfW und BMF (Rechtsstand siehe Ergebnis). Keine Gewähr sowie keine Rechts- oder
        Steuerberatung. Rechtsstand: Richtlinie BEG EM vom 17.07.2026 (BAnz AT 27.08.2026 B1, rückwirkend ab
        21.07.2026), Richtlinie BEG WG vom 17.07.2026 und KfW-Merkblätter 458/261 (Stand 07/2026) — vor einer
        Antragstellung gegen den dann aktuellen Richtlinienstand gegenprüfen.
      </div>

      {/* Fußzeile: einheitlich über alle Tools hinweg (Firma + Anschrift, Kontakt). */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-2 text-[9px] text-muted2">
        <span>energetisiert. energieberatung GmbH · Benno-Strauß-Str. 5A, 90763 Fürth</span>
        <span>info@energetisiert.de · energetisiert.de</span>
      </div>
    </div>
  );
}
