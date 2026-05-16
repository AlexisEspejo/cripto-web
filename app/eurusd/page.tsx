import { AssetDashboard } from '@/components/terminal/AssetDashboard';
import { ASSETS } from '@/lib/asset-registry';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EUR/USD · análisis técnico forex · BTC Terminal',
  description:
    'Análisis técnico del par EUR/USD: 10 indicadores, señales multi-timeframe, charts y consenso operativo.',
};

export default function EurUsdPage() {
  return <AssetDashboard asset={ASSETS.EURUSD!} />;
}
