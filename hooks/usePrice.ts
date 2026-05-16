'use client';
import { useQuery } from '@tanstack/react-query';
import { REFRESH } from '@/lib/constants';
import type { PriceData } from '@/lib/types';

async function fetchPrice(): Promise<PriceData> {
  const r = await fetch('/api/price');
  if (!r.ok) throw new Error('price fetch failed');
  return (await r.json()) as PriceData;
}

export function usePrice() {
  return useQuery({
    queryKey: ['price'],
    queryFn: fetchPrice,
    refetchInterval: REFRESH.PRICE_MS,
    refetchIntervalInBackground: false,
    staleTime: REFRESH.PRICE_MS - 5_000,
  });
}
