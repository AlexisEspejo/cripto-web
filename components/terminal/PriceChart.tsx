'use client';
import { useKlines } from '@/hooks/useKlines';
import { useUIStore } from '@/stores/ui-store';
import { ema } from '@/lib/indicators';
import { fmtDate, fmtPct } from '@/lib/formatters';
import type { KlineInterval } from '@/lib/types';
import { ASSETS, type AssetSpec } from '@/lib/asset-registry';

import { useMemo } from 'react';

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

function shortAxisFor(asset: AssetSpec, v: number): string {
  if (asset.decimals === 0) {
    if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
    return '$' + v.toFixed(0);
  }
  if (asset.decimals >= 4) return v.toFixed(asset.decimals);
  return '$' + v.toFixed(2);
}
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { cn } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const TF_OPTIONS: KlineInterval[] = ['1h', '4h', '1d', '1w'];

export function PriceChart({ asset = ASSETS.BTC! }: { asset?: AssetSpec }) {
  const interval = useUIStore(s => s.chartInterval);
  const setInterval = useUIStore(s => s.setChartInterval);
  const { data } = useKlines(interval, asset.id);

  const { labels, closes, e50, e200, stats } = useMemo(() => {
    if (!data || data.length === 0) {
      return { labels: [], closes: [], e50: [], e200: [], stats: null };
    }
    const lbls = data.map(k => fmtDate(k.time));
    const cl = data.map(k => k.close);
    const high = Math.max(...cl);
    const low = Math.min(...cl);
    const first = cl[0] ?? 0;
    const last = cl[cl.length - 1] ?? 0;
    const chg = first ? (last / first - 1) * 100 : 0;
    return {
      labels: lbls,
      closes: cl,
      e50: ema(cl, 50),
      e200: ema(cl, 200),
      stats: { high, low, chg },
    };
  }, [data]);

  const chartData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: `${asset.symbol}/${asset.quote}`,
        data: closes,
        borderColor: '#f7931a',
        backgroundColor: (ctx) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return 'rgba(247,147,26,0.15)';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(247,147,26,0.25)');
          g.addColorStop(1, 'rgba(247,147,26,0)');
          return g;
        },
        borderWidth: 2,
        tension: 0.25,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
      {
        label: 'EMA 50',
        data: e50,
        borderColor: '#4a90e2',
        borderWidth: 1.4,
        borderDash: [5, 4],
        tension: 0.25,
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'EMA 200',
        data: e200,
        borderColor: '#ff4757',
        borderWidth: 1.4,
        borderDash: [10, 5],
        tension: 0.25,
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10,10,10,0.95)',
        borderColor: '#2a2a2a',
        borderWidth: 1,
        titleColor: '#f7931a',
        bodyColor: '#e8e8e8',
        padding: 12,
        cornerRadius: 0,
        callbacks: {
          label: (ctx) => {
            if (ctx.raw == null) return '';
            const v = ctx.raw as number;
            return `  ${(ctx.dataset.label ?? '').padEnd(8)}  ${fmtPriceFor(asset, v)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { font: { size: 10 }, color: '#666', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        border: { color: '#1f1f1f' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: {
          font: { size: 10 },
          color: '#666',
          padding: 8,
          callback: (v) => shortAxisFor(asset, Number(v)),
        },
        border: { display: false },
      },
    },
  };

  return (
    <section className="border-b border-border-strong px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
              § 04 · Charts Técnicos
            </div>
            <h2 className="title-serif mt-1 text-2xl">
              {asset.symbol}/{asset.quote} · estructura de <em>precio</em>
            </h2>
          </div>
          <div className="flex items-center gap-1 rounded-sm border border-border-strong bg-bg-card p-1">
            {TF_OPTIONS.map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => setInterval(tf)}
                className={cn(
                  'px-2 py-1 text-xs uppercase tracking-wider transition-colors',
                  interval === tf ? 'bg-brand text-bg' : 'text-text-dim hover:text-text',
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {stats && (
          <div className="mt-4 flex flex-wrap gap-6 border-b border-border pb-3 text-xs">
            <Stat label="High" value={fmtPriceFor(asset, stats.high)} />
            <Stat label="Low" value={fmtPriceFor(asset, stats.low)} />
            <Stat
              label="Change"
              value={fmtPct(stats.chg)}
              valueClass={stats.chg >= 0 ? 'text-up' : 'text-down'}
            />
          </div>
        )}

        <div className="mt-4 h-[380px] sm:h-[420px]">
          {data ? (
            <Line data={chartData} options={options} aria-label={`${asset.symbol} price chart`} />
          ) : (
            <div className="skeleton h-full w-full" />
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-mute">{label}</div>
      <div className={cn('tabular-nums', valueClass ?? 'text-text')}>{value}</div>
    </div>
  );
}
