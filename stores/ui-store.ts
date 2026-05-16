'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KlineInterval } from '@/lib/types';

interface UIState {
  chartInterval: KlineInterval;
  asset: 'BTC' | 'ETH';
  setChartInterval: (i: KlineInterval) => void;
  setAsset: (a: 'BTC' | 'ETH') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      chartInterval: '1d',
      asset: 'BTC',
      setChartInterval: i => set({ chartInterval: i }),
      setAsset: a => set({ asset: a }),
    }),
    { name: 'btc-terminal-ui' },
  ),
);
