import { fetchNews, type RawNewsItem } from '@/lib/api-clients/cryptocompare';
import { fetchRssNews } from '@/lib/api-clients/rss-news';
import { classifyNews } from '@/lib/news-sentiment';

export interface NewsAggregate {
  bull: number;
  bear: number;
  neutral: number;
  netScore: number;
  total: number;
}

export async function loadRawNews(): Promise<RawNewsItem[]> {
  if (process.env.CRYPTOCOMPARE_API_KEY) {
    try {
      const raw = await fetchNews();
      if (raw.length > 0) return raw;
    } catch (err) {
      console.warn(
        JSON.stringify({
          news_cryptocompare_failed: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
  return fetchRssNews();
}

export function aggregateSentiment(raw: RawNewsItem[]): NewsAggregate {
  let bull = 0;
  let bear = 0;
  let neutral = 0;
  for (const n of raw) {
    const s = classifyNews(n.title, n.body);
    if (s === 'bull') bull++;
    else if (s === 'bear') bear++;
    else neutral++;
  }
  const total = bull + bear + neutral;
  const netScore = total > 0 ? Math.round(((bull - bear) / total) * 100) : 0;
  return { bull, bear, neutral, netScore, total };
}

/**
 * Best-effort fetch of the news net score. Returns null if anything fails or
 * if it exceeds the provided timeout — caller should treat null as "no news
 * available" and fall back to pure technical analysis.
 */
export async function getNewsNetScore(timeoutMs = 4000): Promise<number | null> {
  try {
    const raw = await Promise.race<RawNewsItem[]>([
      loadRawNews(),
      new Promise<RawNewsItem[]>((_, reject) =>
        setTimeout(() => reject(new Error('news_timeout')), timeoutMs),
      ),
    ]);
    if (raw.length === 0) return null;
    return aggregateSentiment(raw).netScore;
  } catch (err) {
    console.warn(
      JSON.stringify({
        news_score_unavailable: err instanceof Error ? err.message : String(err),
      }),
    );
    return null;
  }
}
