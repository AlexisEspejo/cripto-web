'use client';
import { useConsensus } from '@/hooks/useConsensus';
import { fmtTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IndicatorResult, Verdict } from '@/lib/types';
import { ASSETS, type AssetSpec } from '@/lib/asset-registry';

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

const VERDICT_LABEL: Record<Verdict, string> = {
  STRONG_BUY: 'STRONG BUY',
  BUY: 'COMPRAR',
  HOLD: 'MANTENER',
  SELL: 'VENDER',
  STRONG_SELL: 'STRONG SELL',
};

const verdictColor: Record<Verdict, string> = {
  STRONG_BUY: 'text-up',
  BUY: 'text-up',
  HOLD: 'text-warn',
  SELL: 'text-down',
  STRONG_SELL: 'text-down',
};

const verdictGlow: Record<Verdict, string> = {
  STRONG_BUY: 'drop-shadow-[0_0_16px_rgba(0,214,143,0.4)]',
  BUY: '',
  HOLD: '',
  SELL: '',
  STRONG_SELL: 'drop-shadow-[0_0_16px_rgba(255,71,87,0.4)]',
};

export function VerdictPanel({ asset = ASSETS.BTC! }: { asset?: AssetSpec }) {
  const { data, isLoading, isError } = useConsensus(asset.id);

  if (isLoading) {
    return (
      <section className="border-t-[3px] border-brand bg-gradient-to-b from-brand/[0.03] to-transparent px-4 py-8 sm:px-6">
        <div className="skeleton h-64 w-full" />
      </section>
    );
  }
  if (isError || !data) {
    return (
      <section className="border-t-[3px] border-brand bg-bg-card px-4 py-8 sm:px-6 text-text-dim">
        No se pudo calcular el consenso. Reintentando…
      </section>
    );
  }

  const lp = data.lastPrice;
  const pct = (v: number) => {
    const p = (v / lp - 1) * 100;
    return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
  };

  const scoreColor = data.totalScore >= 5 ? 'text-up' : data.totalScore <= -5 ? 'text-down' : 'text-warn';

  return (
    <section className="border-t-[3px] border-brand bg-gradient-to-b from-brand/[0.04] to-transparent px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
              § 01 · Consenso Técnico
            </div>
            <h2 className="title-serif mt-1 text-3xl">
              <em>¿Comprar</em> o <em>Vender</em>?
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-mute">
            <span className="live-dot" /> Actualizado {fmtTime(data.timestamp)}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Main */}
          <div className="rounded-sm border border-border-strong bg-bg-card p-6">
            <div className="text-[10px] uppercase tracking-widest text-text-mute">
              Recomendación operativa
            </div>
            <div
              className={cn(
                'title-serif mt-2 text-4xl sm:text-5xl font-semibold',
                verdictColor[data.verdict],
                verdictGlow[data.verdict],
              )}
            >
              {VERDICT_LABEL[data.verdict]}
            </div>
            <p className="mt-3 text-sm text-text-dim">{data.verdictNote}</p>

            <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-5 sm:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-mute">
                  Score · escala −{data.maxScore} / +{data.maxScore}
                  {data.includesSentiment && (
                    <span className="ml-1 text-brand">+sentiment</span>
                  )}
                </div>
                <div className={cn('mt-1 text-3xl font-semibold tabular-nums', scoreColor)}>
                  {data.totalScore > 0 ? '+' : ''}
                  {data.totalScore}
                </div>
              </div>
              <Counter label="↑ Compra" value={data.buyCount} color="text-up" />
              <Counter label="◆ Neutral" value={data.neutralCount} color="text-warn" />
              <Counter label="↓ Venta" value={data.sellCount} color="text-down" />
            </div>
          </div>

          {/* Levels */}
          <div className="rounded-sm border border-border-strong bg-bg-card p-6">
            <div className="text-[10px] uppercase tracking-widest text-brand">
              Niveles Operativos
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Level
                label="Entry Zone"
                value={`${fmtPriceFor(asset, data.levels.entry.from)} – ${fmtPriceFor(asset, data.levels.entry.to)}`}
              />
              <Level label="Stop Loss" value={`${fmtPriceFor(asset, data.levels.stop)} (${pct(data.levels.stop)})`} color="text-down" />
              <Level label="Target 1" value={`${fmtPriceFor(asset, data.levels.tp1)} (${pct(data.levels.tp1)})`} color="text-up" />
              <Level label="Target 2" value={`${fmtPriceFor(asset, data.levels.tp2)} (${pct(data.levels.tp2)})`} color="text-up" />
              <Level label="Target 3" value={`${fmtPriceFor(asset, data.levels.tp3)} (${pct(data.levels.tp3)})`} color="text-up" />
            </div>
            <p className="mt-4 border-t border-border pt-3 text-[11px] italic text-text-mute">
              Niveles auto-calculados a partir de Bollinger, EMAs y posición de consenso. No constituyen recomendación de inversión.
            </p>
          </div>
        </div>

        {/* Indicator table */}
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {data.indicators.map(ind => (
            <IndicatorRow key={ind.name} ind={ind} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Counter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-text-mute">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', color)}>{value}</div>
    </div>
  );
}

function Level({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-[11px] uppercase tracking-widest text-text-dim">{label}</span>
      <span className={cn('tabular-nums', color ?? 'text-text')}>{value}</span>
    </div>
  );
}

function IndicatorRow({ ind }: { ind: IndicatorResult }) {
  const pill =
    ind.signal === 2 || ind.signal === 1
      ? 'border-up/40 bg-up/10 text-up'
      : ind.signal === -2 || ind.signal === -1
      ? 'border-down/40 bg-down/10 text-down'
      : 'border-warn/40 bg-warn/10 text-warn';
  return (
    <div className="grid grid-cols-[1.2fr_1fr_auto] items-center gap-3 rounded-sm border border-border-strong bg-bg-card px-4 py-3 sm:grid-cols-[1.2fr_1fr_auto_1.5fr]">
      <span className="text-sm font-medium text-text">{ind.name}</span>
      <span className="tabular-nums text-sm text-text-dim">{ind.value}</span>
      <span className={cn('rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider', pill)}>
        {ind.label}
      </span>
      <span className="col-span-3 italic text-[11px] text-text-mute sm:col-span-1 sm:text-right">
        {ind.note}
      </span>
    </div>
  );
}
