'use client';
import { useQuery } from '@tanstack/react-query';
import type { MarketAsset } from '@/lib/api-clients/coingecko-markets';

interface MarketsResponse {
  items: MarketAsset[];
  timestamp: number;
}

async function fetchMarkets(limit: number): Promise<MarketsResponse> {
  const r = await fetch(`/api/markets?limit=${limit}`);
  if (!r.ok) throw new Error('markets fetch failed');
  return (await r.json()) as MarketsResponse;
}

export function useMarkets(limit = 20) {
  return useQuery({
    queryKey: ['markets', limit],
    queryFn: () => fetchMarkets(limit),
    refetchInterval: 10 * 60_000,
    staleTime: 9 * 60_000,
  });
}
