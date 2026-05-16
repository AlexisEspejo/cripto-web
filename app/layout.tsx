import type { Metadata } from 'next';
import { IBM_Plex_Mono, Newsreader } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';

const ibmPlex = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const newsreader = Newsreader({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://btc-terminal.local'),
  title: 'BTC Terminal · Live Bitcoin Technical Analysis',
  description:
    'Real-time Bitcoin technical analysis terminal — consensus de 10 indicadores, señales multi-timeframe, charts y feed de noticias clasificado por sentiment.',
  keywords: ['Bitcoin', 'BTC', 'technical analysis', 'crypto', 'terminal', 'RSI', 'MACD'],
  openGraph: {
    title: 'BTC Terminal',
    description: 'Análisis técnico de Bitcoin en tiempo real',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${ibmPlex.variable} ${newsreader.variable}`}>
      <body className="bg-bg text-text min-h-screen">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
