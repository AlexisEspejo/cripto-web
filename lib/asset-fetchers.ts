import { fetchKlines, fetchTicker24h, type Ticker24h } from '@/lib/api-clients/binance';
import { krakenKlines, krakenTicker24h } from '@/lib/api-clients/kraken';
import { yahooKlines, yahooTicker24h } from '@/lib/api-clients/yahoo';
import type { AssetSpec } from '@/lib/asset-registry';
import type { Kline, KlineInterval } from '@/lib/types';

/**
 * Resolve a 24h ticker for an arbitrary asset using its registry spec.
 * Order: Binance (crypto) → Kraken (crypto) → Yahoo (all).
 */
export async function fetchAssetTicker(asset: AssetSpec): Promise<Ticker24h> {
  if (asset.type === 'fx') {
    if (!asset.yahooSymbol) throw new Error(`No Yahoo symbol for FX asset ${asset.id}`);
    return yahooTicker24h(asset.yahooSymbol);
  }
  // crypto chain
  const errors: string[] = [];
  if (asset.binancePair) {
    try {
      return await fetchTicker24h(asset.binancePair);
    } catch (err) {
      errors.push(`binance:${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (asset.krakenPair) {
    try {
      return await krakenTicker24h(asset.krakenPair);
    } catch (err) {
      errors.push(`kraken:${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (asset.yahooSymbol) {
    try {
      return await yahooTicker24h(asset.yahooSymbol);
    } catch (err) {
      errors.push(`yahoo:${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`All sources failed for ${asset.id}: ${errors.join(', ')}`);
}

export async function fetchAssetKlines(
  asset: AssetSpec,
  interval: KlineInterval,
  limit: number,
): Promise<Kline[]> {
  if (asset.type === 'fx') {
    if (!asset.yahooSymbol) throw new Error(`No Yahoo symbol for FX asset ${asset.id}`);
    return yahooKlines(asset.yahooSymbol, interval, limit);
  }
  const errors: string[] = [];
  if (asset.binancePair) {
    try {
      return await fetchKlines(interval, limit, asset.binancePair);
    } catch (err) {
      errors.push(`binance:${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (asset.krakenPair) {
    try {
      return await krakenKlines(interval, limit, asset.krakenPair);
    } catch (err) {
      errors.push(`kraken:${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (asset.yahooSymbol) {
    try {
      return await yahooKlines(asset.yahooSymbol, interval, limit);
    } catch (err) {
      errors.push(`yahoo:${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`All sources failed for ${asset.id} klines: ${errors.join(', ')}`);
}
