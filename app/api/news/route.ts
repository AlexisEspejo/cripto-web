import { NextResponse } from 'next/server';
import { aggregateSentiment, loadRawNews } from '@/lib/news-aggregate';
import { classifyNews } from '@/lib/news-sentiment';
import type { NewsResponse, NewsItem } from '@/lib/types';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const raw = await loadRawNews();
    if (raw.length === 0) throw new Error('no_news_items');
    const agg = aggregateSentiment(raw);
    const items: NewsItem[] = raw.map(n => ({
      id: String(n.id ?? n.url),
      title: n.title,
      body: n.body ?? '',
      url: n.url,
      source: n.source_info?.name ?? n.source ?? '',
      publishedOn: n.published_on,
      sentiment: classifyNews(n.title, n.body),
    }));
    const payload: NewsResponse = {
      items,
      aggregate: {
        bull: agg.bull,
        bear: agg.bear,
        neutral: agg.neutral,
        netScore: agg.netScore,
      },
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
    return NextResponse.json({ ok: false, error: 'news_fetch_failed' }, { status: 502 });
  }
}
