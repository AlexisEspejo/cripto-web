'use client';
import { usePrice } from '@/hooks/usePrice';
import { useKlines } from '@/hooks/useKlines';
import { useNews } from '@/hooks/useNews';
import { fmtBig, fmtPct, fmtTime, fmtUSD } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

type Health = 'live' | 'degraded' | 'offline';

function useHealth(): Health {
  const price = usePrice();
  const klines = useKlines('1d');
  const news = useNews();
  const ok = [price.data, klines.data, news.data].filter(Boolean).length;
  if (ok === 3) return 'live';
  if (ok >= 1) return 'degraded';
  return 'offline';
}

export function TopBar() {
  const { data } = usePrice();
  const health = useHealth();
  const [now, setNow] = useState<number>(() => Date.now());
  const prevPrice = useRef<number | null>(null);
  const [flash, setFlash] = useState<'' | 'flash-up' | 'flash-down'>('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (data?.price == null) return;
    if (prevPrice.current != null && data.price !== prevPrice.current) {
      setFlash(data.price > prevPrice.current ? 'flash-up' : 'flash-down');
      const id = setTimeout(() => setFlash(''), 800);
      return () => clearTimeout(id);
    }
    prevPrice.current = data.price;
  }, [data?.price]);

  const statusLabel = health === 'live' ? 'LIVE' : health === 'degraded' ? 'DEGRADADO' : 'OFFLINE';
  const dotClass = health === 'live' ? '' : health === 'degraded' ? 'degraded' : 'offline';

  return (
    <header className="sticky top-0 z-30 border-b border-border-strong bg-bg-elev/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3 sm:px-6">
        <div className="title-serif text-base italic text-text">
          <span className="not-italic font-semibold text-brand">BTC</span>
          <span className="mx-1 text-text-mute">/</span>
          <span className="text-xs uppercase tracking-widest text-text-dim not-italic">
            LIVE · REAL-TIME
          </span>
        </div>

        <div className="ml-auto flex items-center gap-5 text-xs">
          <div className="hidden lg:flex items-center gap-5 text-text-dim">
            <TickerItem label="BTC" value={data ? fmtUSD(data.price) : '…'} flashClass={flash} highlight />
            <TickerItem
              label="24h"
              value={data ? fmtPct(data.change24h) : '…'}
              valueClass={data && data.change24h >= 0 ? 'text-up' : 'text-down'}
            />
            <TickerItem label="VOL" value={data ? fmtBig(data.volume24h) : '…'} />
            <TickerItem label="MC" value={data?.marketCap ? fmtBig(data.marketCap) : '…'} />
            <TickerItem label="ATH" value={data?.ath ? fmtUSD(data.ath) : '…'} />
          </div>

          <div className="flex items-center gap-3 border-l border-border-strong pl-4">
            <span className={cn('live-dot', dotClass)} />
            <div className="leading-tight">
              <div className="font-semibold text-text">{statusLabel}</div>
              <div className="hidden sm:block text-[10px] text-text-mute">
                {fmtTime(now)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function TickerItem({
  label,
  value,
  highlight,
  valueClass,
  flashClass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClass?: string;
  flashClass?: string;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-[10px] uppercase tracking-wider text-text-mute">{label}</span>
      <span
        className={cn(
          'tabular-nums px-1 rounded-sm',
          highlight && 'text-text font-semibold',
          valueClass,
          flashClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}
