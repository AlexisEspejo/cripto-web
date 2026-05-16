import { NextResponse } from 'next/server';
import { fetchKlines } from '@/lib/api-clients/binance';
import { krakenKlines } from '@/lib/api-clients/kraken';
import { generateConsensus } from '@/lib/consensus';
import { KLINES_LIMITS } from '@/lib/constants';

export const revalidate = 300;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get('symbol') ?? 'BTC').toUpperCase() + 'USDT';
  try {
    let klines;
    try {
      klines = await fetchKlines('1d', KLINES_LIMITS['1d'], symbol);
    } catch (err) {
      console.warn(
        JSON.stringify({
          route: '/api/consensus',
          binance_failed: err instanceof Error ? err.message : String(err),
        }),
      );
      // Kraken fallback only supports BTC for now.
      if (symbol !== 'BTCUSDT') throw err;
      klines = await krakenKlines('1d', KLINES_LIMITS['1d']);
    }
    const consensus = generateConsensus(klines);
    return NextResponse.json(consensus, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        route: '/api/consensus',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json(
      { ok: false, error: 'consensus_fetch_failed' },
      { status: 502 },
    );
  }
}
