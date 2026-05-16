'use client';
import { useKlines } from '@/hooks/useKlines';
import { generateSignal, DEFAULT_HORIZONS } from '@/lib/signals';
import { ema, rsi } from '@/lib/indicators';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type Alert = { kind: 'bull' | 'bear' | 'warn'; text: string };

export function AlertsBar() {
  const h1 = useKlines('1h');
  const h4 = useKlines('4h');
  const d = useKlines('1d');
  const w = useKlines('1w');

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    if (!d.data) return [{ kind: 'warn', text: '⏳ Cargando señales técnicas…' }];

    const closes = d.data.map(k => k.close);
    if (closes.length < 200) return [{ kind: 'warn', text: '⏳ Datos insuficientes' }];
    const last = closes[closes.length - 1] ?? 0;
    const prev = closes[closes.length - 2] ?? 0;
    const rsiArr = rsi(closes, 14);
    const lastR = rsiArr[rsiArr.length - 1] ?? null;
    const prevR = rsiArr[rsiArr.length - 2] ?? null;
    const ema200 = ema(closes, 200);
    const e200 = ema200[ema200.length - 1] ?? null;
    const pe200 = ema200[ema200.length - 2] ?? null;

    if (lastR != null && lastR > 70) out.push({ kind: 'bear', text: `⚠ RSI ${lastR.toFixed(1)} sobrecompra — riesgo corrección` });
    else if (lastR != null && lastR < 30) out.push({ kind: 'bull', text: `⚠ RSI ${lastR.toFixed(1)} sobreventa — rebote probable` });

    if (lastR != null && prevR != null) {
      if (prevR < 70 && lastR >= 70) out.push({ kind: 'bear', text: '⚠ RSI cruzó 70 al alza — vigilar venta' });
      if (prevR > 30 && lastR <= 30) out.push({ kind: 'bull', text: '⚠ RSI cruzó 30 a la baja — vigilar compra' });
    }

    if (e200 != null && pe200 != null) {
      if (last > e200 && prev <= pe200) out.push({ kind: 'bull', text: '⚡ Precio reclama EMA200 — bullish setup' });
      if (last < e200 && prev >= pe200) out.push({ kind: 'bear', text: '⚡ Precio pierde EMA200 — bearish setup' });
    }

    const signals = [
      h1.data ? generateSignal(h1.data, DEFAULT_HORIZONS['1h']) : null,
      h4.data ? generateSignal(h4.data, DEFAULT_HORIZONS['4h']) : null,
      d.data ? generateSignal(d.data, DEFAULT_HORIZONS['1d']) : null,
      w.data ? generateSignal(w.data, DEFAULT_HORIZONS['1w']) : null,
    ];

    for (const s of signals) {
      if (!s) continue;
      if (Math.abs(s.score) > 50) {
        out.push({
          kind: s.direction === 'up' ? 'bull' : 'bear',
          text: `▲ ${s.label.tf} score ${s.score > 0 ? '+' : ''}${s.score} · señal fuerte ${
            s.direction === 'up' ? 'alcista' : 'bajista'
          }`,
        });
      }
    }

    if (out.length === 0) {
      out.push({ kind: 'warn', text: '◇ Sin señales extremas — mercado en zona neutral' });
    }
    return out;
  }, [h1.data, h4.data, d.data, w.data]);

  return (
    <div className="flex items-center gap-4 overflow-x-auto border-b border-border-strong bg-bg-elev px-4 py-2.5 text-xs sm:px-6">
      <span className="whitespace-nowrap text-[10px] uppercase tracking-widest text-brand">
        ⚡ Alertas técnicas
      </span>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto">
        {alerts.map((a, i) => (
          <span
            key={i}
            className={cn(
              'whitespace-nowrap rounded-sm border px-2 py-1 text-[11px]',
              a.kind === 'bull' && 'border-up/40 bg-up/5 text-up',
              a.kind === 'bear' && 'border-down/40 bg-down/5 text-down',
              a.kind === 'warn' && 'border-warn/40 bg-warn/5 text-warn',
            )}
          >
            {a.text}
          </span>
        ))}
      </div>
    </div>
  );
}
