'use client';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import type { Kline } from '@/lib/types';
import type { MonteCarloBand, TrendAnalysis } from '@/lib/projections';
import { useMemo } from 'react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface Props {
  history: Kline[];
  bands: MonteCarloBand[];
  trend?: TrendAnalysis | null;
  assetLabel: string;
}

export function ProjectionChart({ history, bands, trend, assetLabel }: Props) {
  const data: ChartData<'line'> = useMemo(() => {
    const histLabels = history.map(k => new Date(k.time).toISOString().slice(0, 10));
    const futureLabels: string[] = [];
    const lastTime = history[history.length - 1]?.time ?? 0;
    const stepMs = history.length >= 2
      ? (history[history.length - 1]!.time - history[history.length - 2]!.time)
      : 86_400_000;
    for (let i = 1; i < bands.length; i++) {
      const d = new Date(lastTime + stepMs * i);
      futureLabels.push(d.toISOString().slice(0, 10));
    }
    const labels = [...histLabels, ...futureLabels];

    const histLen = history.length;
    const pad = (arr: Array<number | null>, before: number) => {
      const out: Array<number | null> = new Array(before).fill(null);
      return out.concat(arr);
    };

    const closes = history.map(k => k.close);

    const p5Future = bands.slice(1).map(b => b.p5);
    const p25Future = bands.slice(1).map(b => b.p25);
    const p50Future = bands.slice(1).map(b => b.p50);
    const p75Future = bands.slice(1).map(b => b.p75);
    const p95Future = bands.slice(1).map(b => b.p95);

    // Regression overlay (linear fit over the analysed window) — extend a bit into the future
    let regression: Array<number | null> = [];
    if (trend) {
      const startIdx = Math.max(0, histLen - 60);
      regression = new Array(startIdx).fill(null);
      const len = histLen - startIdx;
      const slopePerStep = (trend.regression.to - trend.regression.from) / Math.max(1, len - 1);
      for (let i = 0; i < len; i++) {
        regression.push(trend.regression.from + slopePerStep * i);
      }
      // continue regression a few steps into the future
      for (let i = 0; i < bands.length - 1; i++) {
        regression.push(trend.regression.to + slopePerStep * (i + 1));
      }
    }

    return {
      labels,
      datasets: [
        {
          label: 'Histórico',
          data: closes,
          borderColor: '#f7931a',
          backgroundColor: 'rgba(247,147,26,0.08)',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Regresión lineal',
          data: regression,
          borderColor: '#4a90e2',
          borderWidth: 1.2,
          borderDash: [4, 4],
          tension: 0,
          pointRadius: 0,
          fill: false,
        },
        // Confidence bands (p5/p95 outer, p25/p75 inner, p50 median)
        {
          label: 'P95 (best 5 %)',
          data: pad(p95Future, histLen),
          borderColor: 'rgba(0,214,143,0.4)',
          borderWidth: 1,
          pointRadius: 0,
          fill: '+1' as unknown as number, // fill toward next dataset
          backgroundColor: 'rgba(0,214,143,0.06)',
          tension: 0.2,
        },
        {
          label: 'P75',
          data: pad(p75Future, histLen),
          borderColor: 'rgba(0,214,143,0.6)',
          borderWidth: 1,
          pointRadius: 0,
          fill: '+1' as unknown as number,
          backgroundColor: 'rgba(0,214,143,0.12)',
          tension: 0.2,
        },
        {
          label: 'P50 (mediana)',
          data: pad(p50Future, histLen),
          borderColor: '#f7931a',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.2,
        },
        {
          label: 'P25',
          data: pad(p25Future, histLen),
          borderColor: 'rgba(255,71,87,0.6)',
          borderWidth: 1,
          pointRadius: 0,
          fill: '+1' as unknown as number,
          backgroundColor: 'rgba(255,71,87,0.12)',
          tension: 0.2,
        },
        {
          label: 'P5 (worst 5 %)',
          data: pad(p5Future, histLen),
          borderColor: 'rgba(255,71,87,0.4)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0.2,
        },
      ],
    };
  }, [history, bands, trend]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 500 },
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
          label: ctx =>
            ctx.raw == null
              ? ''
              : `  ${(ctx.dataset.label ?? '').padEnd(16)}  $${Number(ctx.raw).toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { font: { size: 10 }, color: '#666', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        border: { color: '#1f1f1f' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: {
          font: { size: 10 },
          color: '#666',
          padding: 8,
          callback: v => {
            const n = Number(v);
            if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
            return '$' + n.toFixed(2);
          },
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="h-[420px] sm:h-[480px]">
      <Line data={data} options={options} aria-label={`${assetLabel} projection chart`} />
    </div>
  );
}
