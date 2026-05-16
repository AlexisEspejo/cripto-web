import { NextResponse } from 'next/server';
import { fetchKlines } from '@/lib/api-clients/binance';
import { krakenKlines } from '@/lib/api-clients/kraken';
import { generateConsensus } from '@/lib/consensus';
import { KLINES_LIMITS } from '@/lib/constants';
import { getNewsNetScore } from '@/lib/news-aggregate';

export const revalidate = 300;
export const dynamic = 'force-dynamic';
// Runtime: Node. Edge would also work, but the RSS fallback for news fetches
// multiple feeds in parallel and we want generous CPU/time budgets here.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get('symbol') ?? 'BTC').toUpperCase() + 'USDT';
  const skipNews = url.searchParams.get('news') === 'off';
  try {
    // Klines (Binance → Kraken fallback) and news in parallel.
    const klinesP: Promise<Awaited<ReturnType<typeof fetchKlines>>> = (async () => {
      try {
        return await fetchKlines('1d', KLINES_LIMITS['1d'], symbol);
      } catch (err) {
        console.warn(
          JSON.stringify({
            route: '/api/consensus',
            binance_failed: err instanceof Error ? err.message : String(err),
          }),
        );
        if (symbol !== 'BTCUSDT') throw err;
        return krakenKlines('1d', KLINES_LIMITS['1d']);
      }
    })();
    const newsP: Promise<number | null> = skipNews
      ? Promise.resolve(null)
      : getNewsNetScore(4000);

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
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json(
      { ok: false, error: 'consensus_fetch_failed' },
      { status: 502 },
    );
  }
}
