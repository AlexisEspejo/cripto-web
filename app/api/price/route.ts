import { NextResponse } from 'next/server';
import { fetchAth } from '@/lib/api-clients/coingecko';
import { fetchAssetTicker } from '@/lib/asset-fetchers';
import { ASSETS, buildCryptoSpec, resolveAsset } from '@/lib/asset-registry';
import type { PriceData } from '@/lib/types';

export const revalidate = 30;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const assetParam = (url.searchParams.get('asset') ?? 'BTC').toUpperCase();
  const asset = resolveAsset(assetParam) ?? buildCryptoSpec(assetParam, assetParam);
  try {
    const tickerP = fetchAssetTicker(asset);
    const athP =
      asset.id === ASSETS.BTC!.id ? fetchAth('bitcoin') : Promise.resolve(null);
    const [ticker, ath] = await Promise.all([tickerP, athP]);
    const price = parseFloat(ticker.lastPrice);
    const data: PriceData = {
      price,
      change24h: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume24h: parseFloat(ticker.quoteVolume),
      marketCap: ath?.marketCap ?? 0,
      ath: ath?.ath ?? 0,
      athDate: ath?.athDate ?? '',
      athChange: ath?.athChange ?? 0,
      timestamp: Date.now(),
    };
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        route: '/api/price',
        asset: asset.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json({ ok: false, error: 'price_fetch_failed' }, { status: 502 });
  }
}
