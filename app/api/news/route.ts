import { NextResponse } from 'next/server';
import { fetchNews } from '@/lib/api-clients/cryptocompare';
import { classifyNews } from '@/lib/news-sentiment';
import type { NewsResponse, NewsItem } from '@/lib/types';

export const revalidate = 300;

export async function GET() {
  try {
    const raw = await fetchNews();
    let bull = 0;
    let bear = 0;
    let neutral = 0;
    const items: NewsItem[] = raw.map((n) => {
      const sentiment = classifyNews(n.title, n.body);
      if (sentiment === 'bull') bull++;
      else if (sentiment === 'bear') bear++;
      else neutral++;
      return {
        id: String(n.id ?? n.url),
        title: n.title,
        body: n.body ?? '',
        url: n.url,
        source: n.source_info?.name ?? n.source ?? '',
        publishedOn: n.published_on,
        sentiment,
      };
    });
    const total = bull + bear + neutral;
    const netScore = total > 0 ? Math.round(((bull - bear) / total) * 100) : 0;
    const payload: NewsResponse = {
      items,
      aggregate: { bull, bear, neutral, netScore },
      timestamp: Date.now(),
    };
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=900',
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        route: '/api/news',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json(
      { ok: false, error: 'news_fetch_failed' },
      { status: 502 },
    );
  }
}
