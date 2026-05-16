import { z } from 'zod';

const NewsItemRawSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  title: z.string(),
  body: z.string().optional().default(''),
  url: z.string(),
  source: z.string().optional().default(''),
  source_info: z.object({ name: z.string() }).optional(),
  published_on: z.number(),
});

const NewsResponseSchema = z.object({
  Data: z.array(NewsItemRawSchema),
});

export type RawNewsItem = z.infer<typeof NewsItemRawSchema>;

export async function fetchNews(): Promise<RawNewsItem[]> {
  const url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC';
  const headers: Record<string, string> = {};
  const key = process.env.CRYPTOCOMPARE_API_KEY;
  if (key) headers.Authorization = `Apikey ${key}`;
  const r = await fetch(url, { headers, next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`CryptoCompare news failed: ${r.status}`);
  const raw: unknown = await r.json();
  const parsed = NewsResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error('News response malformed');
  return parsed.data.Data.slice(0, 30);
}
