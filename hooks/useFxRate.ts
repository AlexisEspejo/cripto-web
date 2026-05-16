'use client';
import { useQuery } from '@tanstack/react-query';
import type { PriceData } from '@/lib/types';

async function fetchFx(): Promise<PriceData> {
  const r = await fetch('/api/price?asset=EURUSD');
  if (!r.ok) throw new Error('fx fetch failed');
  return (await r.json()) as PriceData;
}

/**
 * Returns the current EUR/USD spot price (i.e. "X USD per 1 EUR").
 * Used by /proyecciones to convert USD-quoted assets into EUR.
 */
export function useFxRate() {
  return useQuery({
    queryKey: ['fx', 'EURUSD'],
    queryFn: fetchFx,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
}
