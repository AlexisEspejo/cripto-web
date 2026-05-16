'use client';
import { useQuery } from '@tanstack/react-query';
import { REFRESH } from '@/lib/constants';
import type { NewsResponse } from '@/lib/types';

async function fetchNewsClient(): Promise<NewsResponse> {
  const r = await fetch('/api/news');
  if (!r.ok) throw new Error('news fetch failed');
  return (await r.json()) as NewsResponse;
}

export function useNews(enabled = true) {
  return useQuery({
    queryKey: ['news'],
    queryFn: fetchNewsClient,
    refetchInterval: REFRESH.NEWS_MS,
    staleTime: REFRESH.NEWS_MS - 30_000,
    enabled,
  });
}
