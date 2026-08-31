import type { Metadata } from 'next';
import { Instrument_Sans, Montserrat } from 'next/font/google';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import './globals.css';

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['700', '800'],
});

const instrumentSans = Instrument_Sans({
  variable: '--font-instrument-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sanierungsrechner WG — energetisiert.',
  description:
    'Sanierungskosten schätzen und die günstigste Förderung finden: BEG-Einzelmaßnahmen, KfW 458, KfW 261 und Steuerbonus § 35c im direkten Vergleich.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="de" className={`${montserrat.variable} ${instrumentSans.variable}`}>
      <body className="min-h-screen bg-bg text-ink antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
