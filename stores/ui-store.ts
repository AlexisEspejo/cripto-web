'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KlineInterval } from '@/lib/types';

export type DisplayQuote = 'USD' | 'EUR';

interface UIState {
  chartInterval: KlineInterval;
  asset: 'BTC' | 'ETH';
  displayQuote: DisplayQuote;
  /** When on, the price chart overlays the pattern-derived target/stop. */
  patternOverlayEnabled: boolean;
  setChartInterval: (i: KlineInterval) => void;
  setAsset: (a: 'BTC' | 'ETH') => void;
  setDisplayQuote: (q: DisplayQuote) => void;
  setPatternOverlay: (b: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      chartInterval: '1d',
      asset: 'BTC',
      displayQuote: 'USD',
      patternOverlayEnabled: false,
      setChartInterval: i => set({ chartInterval: i }),
      setAsset: a => set({ asset: a }),
      setDisplayQuote: q => set({ displayQuote: q }),
      setPatternOverlay: b => set({ patternOverlayEnabled: b }),
    }),
    { name: 'btc-terminal-ui' },
  ),
);
