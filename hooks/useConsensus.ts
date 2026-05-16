'use client';
import { useQuery } from '@tanstack/react-query';
import { REFRESH } from '@/lib/constants';
import type { ConsensusResult } from '@/lib/types';

async function fetchConsensus(assetId: string): Promise<ConsensusResult> {
  const r = await fetch(`/api/consensus?asset=${encodeURIComponent(assetId)}`);
  if (!r.ok) throw new Error('consensus fetch failed');
  return (await r.json()) as ConsensusResult;
}

export function useConsensus(assetId = 'BTC') {
  return useQuery({
    queryKey: ['consensus', assetId],
    queryFn: () => fetchConsensus(assetId),
    refetchInterval: REFRESH.CONSENSUS_MS,
    staleTime: REFRESH.CONSENSUS_MS - 30_000,
  });
}
