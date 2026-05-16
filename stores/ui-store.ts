'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KlineInterval } from '@/lib/types';

export type DisplayQuote = 'USD' | 'EUR';

interface UIState {
  chartInterval: KlineInterval;
  asset: 'BTC' | 'ETH';
  displayQuote: DisplayQuote;
  setChartInterval: (i: KlineInterval) => void;
  setAsset: (a: 'BTC' | 'ETH') => void;
  setDisplayQuote: (q: DisplayQuote) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      chartInterval: '1d',
      asset: 'BTC',
      displayQuote: 'USD',
      setChartInterval: i => set({ chartInterval: i }),
      setAsset: a => set({ asset: a }),
      setDisplayQuote: q => set({ displayQuote: q }),
    }),
    { name: 'btc-terminal-ui' },
  ),
);
