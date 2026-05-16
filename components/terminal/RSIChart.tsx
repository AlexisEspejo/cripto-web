'use client';
import { useKlines } from '@/hooks/useKlines';
import { useUIStore } from '@/stores/ui-store';
import { rsi } from '@/lib/indicators';
import { fmtDate } from '@/lib/formatters';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { ASSETS, type AssetSpec } from '@/lib/asset-registry';

export function RSIChart({ asset = ASSETS.BTC! }: { asset?: AssetSpec }) {
  const interval = useUIStore(s => s.chartInterval);
  const { data } = useKlines(interval, asset.id);

  const { labels, rsiData, lastRSI } = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], rsiData: [], lastRSI: null };
    const lbls = data.map(k => fmtDate(k.time));
    const closes = data.map(k => k.close);
    const rsiArr = rsi(closes, 14);
    return { labels: lbls, rsiData: rsiArr, lastRSI: rsiArr[rsiArr.length - 1] ?? null };
  }, [data]);

  const chartData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: 'RSI 14',
        data: rsiData,
        borderColor: '#f7931a',
        backgroundColor: (ctx) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return 'rgba(247,147,26,0.10)';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(247,147,26,0.12)');
          g.addColorStop(1, 'rgba(247,147,26,0)');
          return g;
        },
        borderWidth: 1.8,
        tension: 0.3,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
      {
        label: 'Sobrecompra',
        data: labels.map(() => 70),
        borderColor: 'rgba(255,71,87,0.5)',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Sobreventa',
        data: labels.map(() => 30),
        borderColor: 'rgba(0,214,143,0.5)',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 600 },
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
        displayColors: false,
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.label !== 'RSI 14' || ctx.raw == null) return '';
            const v = ctx.raw as number;
            let zone = 'Neutral';
            if (v >= 70) zone = '◆ Sobrecompra';
            else if (v <= 30) zone = '◆ Sobreventa';
            else if (v >= 50) zone = '◆ Bullish';
            else zone = '◆ Bearish';
            return [`RSI: ${v.toFixed(2)}`, zone].join(' · ');
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
        ticks: { font: { size: 10 }, color: '#666', padding: 8, stepSize: 20 },
        border: { display: false },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <section className="border-b border-border-strong px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-end justify-between">
          <h3 className="title-serif text-xl">
            RSI · <em>momentum</em> (14)
          </h3>
          {lastRSI != null && (
            <div className="text-xs text-text-dim">
              Último: <span className="tabular-nums text-text">{lastRSI.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="mt-4 h-[260px]">
          {data ? (
            <Line data={chartData} options={options} aria-label="RSI 14 chart" />
          ) : (
            <div className="skeleton h-full w-full" />
          )}
        </div>
      </div>
    </section>
  );
}
