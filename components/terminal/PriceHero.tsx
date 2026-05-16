'use client';
import { usePrice } from '@/hooks/usePrice';
import { fmtBig, fmtPct, fmtTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import type { AssetSpec } from '@/lib/asset-registry';
import { ASSETS } from '@/lib/asset-registry';

function fmtPriceFor(asset: AssetSpec, v: number): string {
  if (asset.decimals === 0) return '$' + Math.round(v).toLocaleString('en-US');
  return (
    '$' +
    v.toLocaleString('en-US', {
      minimumFractionDigits: asset.decimals,
      maximumFractionDigits: asset.decimals,
    })
  );
}

export function PriceHero({ asset = ASSETS.BTC! }: { asset?: AssetSpec }) {
  const { data } = usePrice(asset.id);
  const [flash, setFlash] = useState<'' | 'flash-up' | 'flash-down'>('');
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (!data) return;
    if (prev.current != null && data.price !== prev.current) {
      setFlash(data.price > prev.current ? 'flash-up' : 'flash-down');
      const id = setTimeout(() => setFlash(''), 800);
      prev.current = data.price;
      return () => clearTimeout(id);
    }
    prev.current = data.price;
  }, [data]);

  return (
    <section className="grid gap-6 border-b border-border-strong px-4 py-10 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:gap-10 lg:py-14">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-text-mute">
          Terminal Live · {asset.symbol}/{asset.quote}
        </div>
        <h1 className="title-serif mt-3 text-3xl leading-tight sm:text-4xl lg:text-5xl">
          {asset.name}: <em>{asset.symbol}</em> en <em>tiempo real</em>.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-dim">
          Consenso técnico de {asset.hasNews ? '10 indicadores + sentiment' : '10 indicadores'},
          señales multi-timeframe, charts en vivo. Datos vía{' '}
          {asset.type === 'fx' ? 'Yahoo Finance' : 'Binance / Kraken / CoinGecko'}.
        </p>
      </div>

      <div className="rounded-sm border border-border-strong bg-bg-card p-5">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-text-dim">
          <span className="flex items-center gap-2">
            <span className="live-dot" /> Precio Spot · {asset.quote}
          </span>
          {data && <span className="text-text-mute">{fmtTime(data.timestamp)}</span>}
        </div>
        <div
          className={cn(
            'mt-3 font-semibold tabular-nums leading-none text-text rounded',
            'text-4xl sm:text-5xl lg:text-[56px]',
            flash,
          )}
        >
          {data ? (
            <PriceDisplay v={data.price} asset={asset} />
          ) : (
            <span className="text-text-mute">$--,---.--</span>
          )}
        </div>
        <div className="mt-3 flex gap-4 text-sm">
          <span className={cn(data && data.change24h >= 0 ? 'text-up' : 'text-down')}>
            {data ? `${fmtPct(data.change24h)} (24h)` : '…'}
          </span>
          {data?.athChange != null && data.ath > 0 && (
            <span className="text-down">{fmtPct(data.athChange)} vs ATH</span>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-xs">
          <Stat label="24h Low" value={data ? fmtPriceFor(asset, data.low24h) : '…'} />
          <Stat label="24h High" value={data ? fmtPriceFor(asset, data.high24h) : '…'} />
          {data?.ath && data.ath > 0 ? (
            <Stat label="ATH" value={fmtPriceFor(asset, data.ath)} />
          ) : (
            <Stat label="Range" value="—" />
          )}
          <Stat label="Volume 24h" value={data ? fmtBig(data.volume24h) : '…'} />
          {data?.marketCap && data.marketCap > 0 ? (
            <Stat label="Market Cap" value={fmtBig(data.marketCap)} />
          ) : (
            <Stat label="Type" value={asset.type.toUpperCase()} />
          )}
          <Stat label="Source" value={asset.type === 'fx' ? 'Yahoo' : 'Binance/Kraken'} />
        </dl>
      </div>
    </section>
  );
}

function PriceDisplay({ v, asset }: { v: number; asset: AssetSpec }) {
  if (asset.decimals === 0) {
    const dollars = Math.floor(v).toLocaleString('en-US');
    const cents = (v % 1).toFixed(2).slice(1);
    return (
      <span>
        ${dollars}
        <span className="text-text-dim text-[0.55em] align-baseline">{cents}</span>
      </span>
    );
  }
  return (
    <span>
      $
      {v.toLocaleString('en-US', {
        minimumFractionDigits: asset.decimals,
        maximumFractionDigits: asset.decimals,
      })}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-t border-border pt-2">
      <dt className="text-[10px] uppercase tracking-wider text-text-mute">{label}</dt>
      <dd className="tabular-nums text-text">{value}</dd>
    </div>
  );
}
