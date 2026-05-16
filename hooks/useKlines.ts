'use client';
import { useQuery } from '@tanstack/react-query';
import { REFRESH } from '@/lib/constants';
import type { Kline, KlineInterval } from '@/lib/types';

async function fetchKlines(interval: KlineInterval, assetId: string): Promise<Kline[]> {
  const r = await fetch(
    `/api/klines/${interval}?asset=${encodeURIComponent(assetId)}`,
  );
  if (!r.ok) throw new Error(`klines ${interval} failed`);
  return (await r.json()) as Kline[];
}

export function useKlines(interval: KlineInterval, assetId = 'BTC') {
  return useQuery({
    queryKey: ['klines', interval, assetId],
    queryFn: () => fetchKlines(interval, assetId),
    refetchInterval: REFRESH.KLINES_MS,
    staleTime: REFRESH.KLINES_MS - 30_000,
  });
}
