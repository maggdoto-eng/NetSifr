import type { Metadata } from 'next';
import { Archivo, Inter, IBM_Plex_Mono } from 'next/font/google';
// tokens.css must load before globals.css: it defines the design-system CSS
// variables (--pine, --bg-app, …) in a plain stylesheet Tailwind won't prune.
import './tokens.css';
import './globals.css';

// Display headings — Archivo, per the NetSifr design prototype.
const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

// Body — Inter.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

// Mono labels — IBM Plex Mono.
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'NetSifr',
  description: 'NetSifr — a social learning and action platform for climate work.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
