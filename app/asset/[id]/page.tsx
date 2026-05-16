import { AssetDashboard } from '@/components/terminal/AssetDashboard';
import { ASSETS, buildCryptoSpec } from '@/lib/asset-registry';
import { fetchTopMarkets } from '@/lib/api-clients/coingecko-markets';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function resolveDynamic(id: string) {
  const upper = id.toUpperCase();
  if (ASSETS[upper]) return ASSETS[upper];
  // Try to find in top 100 markets
  try {
    const markets = await fetchTopMarkets(100, 100);
    const found = markets.find(m => m.symbol === upper);
    if (found) {
      const decimals = found.currentPrice >= 100 ? 0 : found.currentPrice >= 1 ? 2 : 4;
      return buildCryptoSpec(upper, found.name, found.id, decimals);
    }
  } catch {
    // ignore
  }
  return null;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { id } = await params;
  const asset = await resolveDynamic(id);
  if (!asset) return { title: 'Asset not found · BTC Terminal' };
  return {
    title: `${asset.name} (${asset.symbol}) · análisis técnico · BTC Terminal`,
    description: `Análisis técnico en tiempo real para ${asset.name}: 10 indicadores, señales multi-timeframe, charts y consenso.`,
  };
}

export default async function AssetPage({ params }: RouteParams) {
  const { id } = await params;
  const asset = await resolveDynamic(id);
  if (!asset) notFound();
  return <AssetDashboard asset={asset} />;
}
