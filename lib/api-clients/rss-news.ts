import type { RawNewsItem } from './cryptocompare';

interface FeedSource {
  name: string;
  url: string;
}

const FEEDS: FeedSource[] = [
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss/tag/bitcoin' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed' },
  { name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/feed' },
];

const BTC_KEYWORDS = ['bitcoin', 'btc', 'satoshi', 'lightning', 'mining', 'halving'];

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagContent(item: string, tag: string): string | null {
  const open = `<${tag}[^>]*>`;
  const re = new RegExp(`${open}([\\s\\S]*?)</${tag}>`, 'i');
  const m = item.match(re);
  return m && m[1] != null ? stripCdata(m[1]) : null;
}

function parseRss(xml: string, source: string): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = tagContent(block, 'title');
    const link = tagContent(block, 'link');
    const pubDate = tagContent(block, 'pubDate');
    const description =
      tagContent(block, 'content:encoded') ?? tagContent(block, 'description') ?? '';
    if (!title || !link) continue;
    const cleanTitle = stripHtml(title);
    const cleanBody = stripHtml(description).slice(0, 600);
    const ts = pubDate ? Date.parse(pubDate) : NaN;
    const publishedOn = Number.isFinite(ts) ? Math.floor(ts / 1000) : Math.floor(Date.now() / 1000);
    items.push({
      id: link,
      title: cleanTitle,
      body: cleanBody,
      url: link,
      source,
      source_info: { name: source },
      published_on: publishedOn,
    });
  }
  return items;
}

async function fetchOne(feed: FeedSource): Promise<RawNewsItem[]> {
  try {
    const r = await fetch(feed.url, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'btc-terminal/0.1 (+rss-aggregator)' },
    });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseRss(xml, feed.name);
  } catch (err) {
    console.warn(
      JSON.stringify({
        rss_feed_failed: feed.name,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return [];
  }
}

function isBtcRelevant(item: RawNewsItem): boolean {
  const t = (item.title + ' ' + item.body).toLowerCase();
  return BTC_KEYWORDS.some(k => t.includes(k));
}

export async function fetchRssNews(): Promise<RawNewsItem[]> {
  const results = await Promise.all(FEEDS.map(fetchOne));
  const merged = results.flat();
  // Filter Decrypt + Bitcoin Magazine which cover the whole crypto space.
  // CoinTelegraph feed is already BTC-tagged.
  const relevant = merged.filter(
    item => item.source === 'CoinTelegraph' || isBtcRelevant(item),
  );
  relevant.sort((a, b) => b.published_on - a.published_on);
  return relevant.slice(0, 30);
}
