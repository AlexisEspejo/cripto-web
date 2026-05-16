import { PEGGED_BLOCKLIST } from '@/lib/asset-registry';

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
  priceChangePct24h: number;
  priceChangePct7d: number | null;
  sparkline7d: number[];
}

interface CoinGeckoMarketRaw {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number | null;
  low_24h: number | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  sparkline_in_7d?: { price: number[] };
}

const CG = 'https://api.coingecko.com';

export async function fetchTopMarkets(limit = 20, perPage = 100): Promise<MarketAsset[]> {
  const headers: Record<string, string> = {};
  const key = process.env.COINGECKO_API_KEY;
  if (key) headers['x-cg-demo-api-key'] = key;
  const url =
    `${CG}/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc` +
    `&per_page=${perPage}&page=1&sparkline=true` +
    `&price_change_percentage=24h%2C7d`;
  const r = await fetch(url, { headers, next: { revalidate: 600 } });
  if (!r.ok) throw new Error(`CoinGecko markets failed: ${r.status}`);
  const raw = (await r.json()) as CoinGeckoMarketRaw[];
  const filtered = raw.filter(c => !PEGGED_BLOCKLIST.has(c.id));
  return filtered.slice(0, limit).map((c): MarketAsset => ({
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    image: c.image,
    currentPrice: c.current_price,
    marketCap: c.market_cap,
    marketCapRank: c.market_cap_rank,
    totalVolume: c.total_volume,
    high24h: c.high_24h ?? c.current_price,
    low24h: c.low_24h ?? c.current_price,
    priceChange24h: c.price_change_24h ?? 0,
    priceChangePct24h: c.price_change_percentage_24h ?? 0,
    priceChangePct7d: c.price_change_percentage_7d_in_currency ?? null,
    sparkline7d: c.sparkline_in_7d?.price ?? [],
  }));
}
