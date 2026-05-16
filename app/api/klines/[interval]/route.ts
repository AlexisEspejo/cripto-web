import { NextResponse } from 'next/server';
import { fetchAssetKlines } from '@/lib/asset-fetchers';
import { buildCryptoSpec, resolveAsset } from '@/lib/asset-registry';
import { KLINES_LIMITS } from '@/lib/constants';
import type { KlineInterval } from '@/lib/types';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const VALID: ReadonlySet<KlineInterval> = new Set(['1h', '4h', '1d', '1w']);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ interval: string }> },
) {
  const { interval } = await params;
  if (!VALID.has(interval as KlineInterval)) {
    return NextResponse.json({ ok: false, error: 'invalid_interval' }, { status: 400 });
  }
  const url = new URL(req.url);
  const assetParam = (url.searchParams.get('asset') ?? 'BTC').toUpperCase();
  const asset = resolveAsset(assetParam) ?? buildCryptoSpec(assetParam, assetParam);
  const limitParam = url.searchParams.get('limit');
  const defaultLimit = KLINES_LIMITS[interval as KlineInterval];
  const limit = limitParam
    ? Math.min(1000, Math.max(50, parseInt(limitParam, 10) || defaultLimit))
    : defaultLimit;
  try {
    const klines = await fetchAssetKlines(asset, interval as KlineInterval, limit);
    return NextResponse.json(klines, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        route: `/api/klines/${interval}`,
        asset: asset.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json(
      { ok: false, error: 'klines_fetch_failed' },
      { status: 502 },
    );
  }
}
