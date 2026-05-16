'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import type { MarketAsset } from '@/lib/api-clients/coingecko-markets';
import { fmtBig, fmtPct } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function fmtPrice(v: number): string {
  if (v >= 100) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toFixed(6);
}

interface Props {
  market: MarketAsset;
  rank: number;
}

export function MarketCard({ market, rank }: Props) {
  const sparkPath = useMemo(() => buildSparkline(market.sparkline7d), [market.sparkline7d]);
  const chgColor =
    market.priceChangePct24h >= 0 ? 'text-up' : 'text-down';
  const trendColor =
    market.priceChangePct7d != null && market.priceChangePct7d >= 0
      ? '#00d68f'
      : '#ff4757';
  return (
    <Link
      href={`/asset/${encodeURIComponent(market.symbol)}`}
      className="group block rounded-sm border border-border-strong bg-bg-card p-4 transition-colors hover:border-brand"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={market.image}
            alt=""
            width={28}
            height={28}
            className="rounded-full"
            loading="lazy"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text truncate">
              {market.symbol}{' '}
              <span className="text-text-mute text-[10px] font-normal">#{rank}</span>
            </div>
            <div className="text-[11px] text-text-dim truncate">{market.name}</div>
          </div>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-text-mute opacity-0 group-hover:opacity-100 transition-opacity">
          Análisis →
        </span>
      </header>

      <div className="mt-4">
        <div className="text-lg font-semibold tabular-nums text-text">
          {fmtPrice(market.currentPrice)}
        </div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums mt-0.5">
          <span className={chgColor}>{fmtPct(market.priceChangePct24h)}</span>
          <span className="text-text-mute">24h</span>
          {market.priceChangePct7d != null && (
            <>
              <span className="text-text-mute">·</span>
              <span className={market.priceChangePct7d >= 0 ? 'text-up' : 'text-down'}>
                {fmtPct(market.priceChangePct7d)}
              </span>
              <span className="text-text-mute">7d</span>
            </>
          )}
        </div>
      </div>

      {sparkPath && (
        <svg
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
          className="mt-3 h-10 w-full"
          aria-hidden
        >
          <path d={sparkPath} fill="none" stroke={trendColor} strokeWidth={1.5} />
        </svg>
      )}

      <footer className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] uppercase tracking-wider text-text-mute">
        <span>MC {fmtBig(market.marketCap)}</span>
        <span>Vol {fmtBig(market.totalVolume)}</span>
      </footer>
    </Link>
  );
}

function buildSparkline(points: number[]): string | null {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = 100 / (points.length - 1);
  return points
    .map((p, i) => {
      const x = (i * stepX).toFixed(2);
      const y = (30 - ((p - min) / range) * 28 - 1).toFixed(2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

export function MarketCardSkeleton() {
  return <div className="skeleton h-44 rounded-sm" />;
}

export { cn };
