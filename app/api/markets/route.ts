import { NextResponse } from 'next/server';
import { fetchTopMarkets } from '@/lib/api-clients/coingecko-markets';

export const revalidate = 600;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(5, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
  try {
    const markets = await fetchTopMarkets(limit, 100);
    return NextResponse.json(
      { items: markets, timestamp: Date.now() },
      {
        headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' },
      },
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        route: '/api/markets',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json({ ok: false, error: 'markets_fetch_failed' }, { status: 502 });
  }
}
