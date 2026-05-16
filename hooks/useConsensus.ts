'use client';
import { useQuery } from '@tanstack/react-query';
import { REFRESH } from '@/lib/constants';
import type { ConsensusResult } from '@/lib/types';

async function fetchConsensus(): Promise<ConsensusResult> {
  const r = await fetch('/api/consensus');
  if (!r.ok) throw new Error('consensus fetch failed');
  return (await r.json()) as ConsensusResult;
}

export function useConsensus() {
  return useQuery({
    queryKey: ['consensus'],
    queryFn: fetchConsensus,
    refetchInterval: REFRESH.CONSENSUS_MS,
    staleTime: REFRESH.CONSENSUS_MS - 30_000,
  });
}
