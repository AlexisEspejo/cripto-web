import { fetchKlines, fetchTicker24h, type Ticker24h } from '@/lib/api-clients/binance';
import { krakenKlines, krakenTicker24h } from '@/lib/api-clients/kraken';
import { yahooKlines, yahooTicker24h } from '@/lib/api-clients/yahoo';
import { ASSETS, type AssetSpec } from '@/lib/asset-registry';
import type { Kline, KlineInterval } from '@/lib/types';

/** Invert OHLCV: x → 1/x; high & low swap because max(1/x) = 1/min(x). */
function invertKline(k: Kline): Kline {
  return {
    time: k.time,
    open: k.open > 0 ? 1 / k.open : 0,
    high: k.low > 0 ? 1 / k.low : 0,
    low: k.high > 0 ? 1 / k.high : 0,
    close: k.close > 0 ? 1 / k.close : 0,
    volume: k.volume, // notional volume — leave as-is
  };
}

function invertKlines(klines: Kline[]): Kline[] {
  return klines.map(invertKline);
}

function invertTicker(t: Ticker24h): Ticker24h {
  const last = parseFloat(t.lastPrice);
  const high = parseFloat(t.highPrice);
  const low = parseFloat(t.lowPrice);
  const changePct = parseFloat(t.priceChangePercent);
  // Original prevClose: last / (1 + chg/100)
  const prevClose = changePct === -100 ? last : last / (1 + changePct / 100);
  // Inverted: (1/last) / (1/prevClose) - 1 = prevClose/last - 1
  const invChange = last > 0 ? (prevClose / last - 1) * 100 : 0;
  const baseQuoteVolume = parseFloat(t.quoteVolume);
  const baseVolume = parseFloat(t.volume);
  return {
    lastPrice: String(last > 0 ? 1 / last : 0),
    priceChangePercent: String(invChange),
    highPrice: String(low > 0 ? 1 / low : 0),
    lowPrice: String(high > 0 ? 1 / high : 0),
    // After inversion the base/quote currencies swap; keep notional volume
    // expressed in the new quote.
    volume: String(baseQuoteVolume),
    quoteVolume: String(baseVolume),
  };
}

async function fetchAssetTickerRaw(asset: AssetSpec): Promise<Ticker24h> {
  if (asset.type === 'fx') {
    if (!asset.yahooSymbol) throw new Error(`No Yahoo symbol for FX asset ${asset.id}`);
    return yahooTicker24h(asset.yahooSymbol);
  }
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

async function fetchAssetKlinesRaw(
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

export async function fetchAssetTicker(asset: AssetSpec): Promise<Ticker24h> {
  if (asset.invertOf) {
    const base = ASSETS[asset.invertOf];
    if (!base) throw new Error(`invertOf target ${asset.invertOf} not found`);
    const t = await fetchAssetTickerRaw(base);
    return invertTicker(t);
  }
  return fetchAssetTickerRaw(asset);
}

export async function fetchAssetKlines(
  asset: AssetSpec,
  interval: KlineInterval,
  limit: number,
): Promise<Kline[]> {
  if (asset.invertOf) {
    const base = ASSETS[asset.invertOf];
    if (!base) throw new Error(`invertOf target ${asset.invertOf} not found`);
    const raw = await fetchAssetKlinesRaw(base, interval, limit);
    return invertKlines(raw);
  }
  return fetchAssetKlinesRaw(asset, interval, limit);
}
