'use client';
import { useQuery } from '@tanstack/react-query';
import { REFRESH } from '@/lib/constants';
import type { PriceData } from '@/lib/types';

async function fetchPrice(assetId: string): Promise<PriceData> {
  const r = await fetch(`/api/price?asset=${encodeURIComponent(assetId)}`);
  if (!r.ok) throw new Error('price fetch failed');
  return (await r.json()) as PriceData;
}

export function usePrice(assetId = 'BTC') {
  return useQuery({
    queryKey: ['price', assetId],
    queryFn: () => fetchPrice(assetId),
    refetchInterval: REFRESH.PRICE_MS,
    refetchIntervalInBackground: false,
    staleTime: REFRESH.PRICE_MS - 5_000,
  });
}
