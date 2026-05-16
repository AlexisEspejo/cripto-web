import { NextResponse } from 'next/server';
import { fetchAssetKlines } from '@/lib/asset-fetchers';
import { buildCryptoSpec, resolveAsset } from '@/lib/asset-registry';
import { generateConsensus } from '@/lib/consensus';
import { KLINES_LIMITS } from '@/lib/constants';
import { getNewsNetScore } from '@/lib/news-aggregate';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const assetParam = (url.searchParams.get('asset') ?? 'BTC').toUpperCase();
  const asset = resolveAsset(assetParam) ?? buildCryptoSpec(assetParam, assetParam);
  const skipNews = url.searchParams.get('news') === 'off';
  try {
    const klinesP = fetchAssetKlines(asset, '1d', KLINES_LIMITS['1d']);
    const newsP: Promise<number | null> =
      skipNews || !asset.hasNews ? Promise.resolve(null) : getNewsNetScore(4000);
    const [klines, newsNetScore] = await Promise.all([klinesP, newsP]);
    const consensus = generateConsensus(klines, { newsNetScore });
    return NextResponse.json(consensus, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        route: '/api/consensus',
        asset: asset.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json(
      { ok: false, error: 'consensus_fetch_failed' },
      { status: 502 },
    );
  }
}
