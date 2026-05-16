import { NextResponse } from 'next/server';
import { fetchKlines } from '@/lib/api-clients/binance';
import { KLINES_LIMITS } from '@/lib/constants';
import type { KlineInterval } from '@/lib/types';

export const revalidate = 300;
export const runtime = 'edge';

const VALID: ReadonlySet<KlineInterval> = new Set(['1h', '4h', '1d', '1w']);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ interval: string }> },
) {
  const { interval } = await params;
  if (!VALID.has(interval as KlineInterval)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_interval' },
      { status: 400 },
    );
  }
  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const defaultLimit = KLINES_LIMITS[interval as KlineInterval];
  const limit = limitParam ? Math.min(1000, Math.max(50, parseInt(limitParam, 10) || defaultLimit)) : defaultLimit;
  try {
    const klines = await fetchKlines(interval as KlineInterval, limit);
    return NextResponse.json(klines, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        route: `/api/klines/${interval}`,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json(
      { ok: false, error: 'klines_fetch_failed' },
      { status: 502 },
    );
  }
}
