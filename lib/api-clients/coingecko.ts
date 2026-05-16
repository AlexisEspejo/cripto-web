export interface CoinGeckoSnapshot {
  ath: number;
  athDate: string;
  athChange: number;
  marketCap: number;
}

const CG = 'https://api.coingecko.com';

export async function fetchAth(coinId = 'bitcoin'): Promise<CoinGeckoSnapshot | null> {
  try {
    const headers: Record<string, string> = {};
    const key = process.env.COINGECKO_API_KEY;
    if (key) headers['x-cg-demo-api-key'] = key;
    const r = await fetch(
      `${CG}/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
      { headers, next: { revalidate: 3600 } },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      market_data?: {
        ath?: { usd?: number };
        ath_date?: { usd?: string };
        ath_change_percentage?: { usd?: number };
        market_cap?: { usd?: number };
      };
    };
    const md = j.market_data;
    if (!md || md.ath?.usd == null) return null;
    return {
      ath: md.ath.usd,
      athDate: md.ath_date?.usd ?? '',
      athChange: md.ath_change_percentage?.usd ?? 0,
      marketCap: md.market_cap?.usd ?? 0,
    };
  } catch {
    return null;
  }
}
