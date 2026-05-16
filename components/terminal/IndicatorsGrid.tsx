'use client';
import { useKlines } from '@/hooks/useKlines';
import { ema, macd, rsi } from '@/lib/indicators';
import { fmtPct, fmtUSD } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export function IndicatorsGrid() {
  const { data } = useKlines('1d');

  const computed = useMemo(() => {
    if (!data) return null;
    const closes = data.map(k => k.close);
    if (closes.length < 200) return null;
    const last = closes[closes.length - 1] ?? 0;
    const rsiArr = rsi(closes, 14);
    const lastRSI = rsiArr[rsiArr.length - 1] ?? 0;
    const e50A = ema(closes, 50);
    const e200A = ema(closes, 200);
    const e50 = e50A[e50A.length - 1] ?? 0;
    const e200 = e200A[e200A.length - 1] ?? 0;
    const m = macd(closes);
    const lm = m.macd[m.macd.length - 1] ?? 0;
    const ls = m.signal[m.signal.length - 1] ?? 0;
    const lh = m.histogram[m.histogram.length - 1] ?? 0;
    return { last, lastRSI, e50, e200, lm, ls, lh };
  }, [data]);

  if (!computed) {
    return (
      <section className="border-b border-border-strong px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
            § 03 · Indicadores Clave
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skeleton h-32 rounded-sm" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const { last, lastRSI, e50, e200, lm, ls, lh } = computed;

  let rsiTag: string = 'warn';
  let rsiZone: string = 'Neutral';
  if (lastRSI > 70) {
    rsiTag = 'down';
    rsiZone = 'Sobrecompra';
  } else if (lastRSI > 55) {
    rsiTag = 'up';
    rsiZone = 'Alcista';
  } else if (lastRSI < 30) {
    rsiTag = 'up';
    rsiZone = 'Sobreventa';
  } else if (lastRSI < 45) {
    rsiTag = 'down';
    rsiZone = 'Bajista';
  }

  const macdTag = lm > ls ? 'up' : 'down';
  const macdLabel = lm > ls ? 'Compra' : 'Venta';

  const cards = [
    {
      name: 'RSI (14)',
      tag: rsiTag,
      tagLabel: rsiZone,
      value: lastRSI.toFixed(2),
      barWidth: Math.min(100, lastRSI),
      barColor: 'bg-brand',
      context:
        'Período 14 días. Sobre 70 = sobrecompra. Bajo 30 = sobreventa.',
    },
    {
      name: 'MACD (12,26,9)',
      tag: macdTag,
      tagLabel: macdLabel,
      value: `${lm >= 0 ? '+' : ''}${lm.toFixed(1)}`,
      valueColor: lh > 0 ? 'text-up' : 'text-down',
      barWidth: Math.min(100, Math.abs(lh) * 10),
      barColor: lh > 0 ? 'bg-up' : 'bg-down',
      context: `Línea MACD ${lm > ls ? 'sobre' : 'bajo'} señal. Histograma: ${lh >= 0 ? '+' : ''}${lh.toFixed(1)}.`,
    },
    {
      name: 'EMA 50',
      tag: last > e50 ? 'up' : 'down',
      tagLabel: last > e50 ? 'Sobre' : 'Bajo',
      value: fmtUSD(e50),
      barWidth: 50,
      barColor: 'bg-info',
      context: `Tendencia media. Diff vs precio: ${fmtPct((last / e50 - 1) * 100)}.`,
    },
    {
      name: 'EMA 200',
      tag: last > e200 ? 'up' : 'down',
      tagLabel: last > e200 ? 'Sobre' : 'Bajo',
      value: fmtUSD(e200),
      barWidth: 75,
      barColor: last > e200 ? 'bg-up' : 'bg-down',
      context: `Tendencia larga · gate alcista clave. Diff: ${fmtPct((last / e200 - 1) * 100)}.`,
    },
  ];

  return (
    <section className="border-b border-border-strong px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
          § 03 · Indicadores Clave
        </div>
        <h2 className="title-serif mt-1 text-2xl">
          Lectura <em>técnica</em> del momento
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(c => (
            <article
              key={c.name}
              className="group rounded-sm border border-border-strong bg-bg-card p-4 transition-colors hover:border-brand"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">{c.name}</span>
                <span
                  className={cn(
                    'rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider',
                    c.tag === 'up' && 'border-up/40 bg-up/10 text-up',
                    c.tag === 'down' && 'border-down/40 bg-down/10 text-down',
                    c.tag === 'warn' && 'border-warn/40 bg-warn/10 text-warn',
                  )}
                >
                  {c.tagLabel}
                </span>
              </div>
              <div className={cn('mt-3 text-3xl font-semibold tabular-nums', c.valueColor)}>
                {c.value}
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden bg-bg-elev">
                <div className={cn('h-full', c.barColor)} style={{ width: `${c.barWidth}%` }} />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-text-mute">{c.context}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
