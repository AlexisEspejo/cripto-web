'use client';
import { useKlines } from '@/hooks/useKlines';
import { DEFAULT_HORIZONS, generateSignal } from '@/lib/signals';
import type { TimeframeSignal, KlineInterval } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ASSETS, type AssetSpec } from '@/lib/asset-registry';

const ORDER: KlineInterval[] = ['1h', '4h', '1d', '1w'];

export function SignalsGrid({ asset = ASSETS.BTC! }: { asset?: AssetSpec }) {
  const h1 = useKlines('1h', asset.id);
  const h4 = useKlines('4h', asset.id);
  const d = useKlines('1d', asset.id);
  const w = useKlines('1w', asset.id);

  const map: Record<KlineInterval, TimeframeSignal | null> = {
    '1h': h1.data ? generateSignal(h1.data, DEFAULT_HORIZONS['1h']) : null,
    '4h': h4.data ? generateSignal(h4.data, DEFAULT_HORIZONS['4h']) : null,
    '1d': d.data ? generateSignal(d.data, DEFAULT_HORIZONS['1d']) : null,
    '1w': w.data ? generateSignal(w.data, DEFAULT_HORIZONS['1w']) : null,
  };

  return (
    <section className="border-b border-border-strong px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
          § 02 · Señales Multi-Timeframe
        </div>
        <h2 className="title-serif mt-1 text-2xl">
          ¿Qué dice cada <em>horizonte</em>?
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER.map(tf => (
            <SignalCard key={tf} sig={map[tf]} tf={tf} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SignalCard({ sig, tf }: { sig: TimeframeSignal | null; tf: KlineInterval }) {
  if (!sig) {
    return (
      <div className="skeleton h-48 rounded-sm" aria-label={`Loading ${tf} signal`} />
    );
  }
  const arrow = sig.direction === 'up' ? '↑' : sig.direction === 'down' ? '↓' : '→';
  const label = sig.direction === 'up' ? 'AL ALZA' : sig.direction === 'down' ? 'A LA BAJA' : 'LATERAL';
  const dirColor =
    sig.direction === 'up' ? 'text-up' : sig.direction === 'down' ? 'text-down' : 'text-warn';
  const fillColor =
    sig.direction === 'up' ? 'bg-up' : sig.direction === 'down' ? 'bg-down' : 'bg-warn';
  const fillWidth = Math.abs(sig.score) / 2;
  const left = sig.score >= 0 ? 50 : 50 - fillWidth;

  return (
    <article className="rounded-sm border border-border-strong bg-bg-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-base font-semibold text-text">{sig.label.tf}</span>
        <span className="text-[10px] uppercase tracking-wider text-text-mute">{sig.label.horizon}</span>
      </div>
      <div className={cn('mt-4 flex items-center gap-2 text-2xl font-semibold', dirColor)}>
        <span>{arrow}</span>
        <span className="text-sm uppercase tracking-widest">{label}</span>
      </div>

      <div className="mt-4">
        <div className="relative h-1.5 w-full overflow-hidden bg-bg-elev">
          <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
          <div
            className={cn('absolute inset-y-0', fillColor)}
            style={{ left: `${left}%`, width: `${fillWidth}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-text-mute">
          <span>Score</span>
          <span className="tabular-nums text-text-dim">
            {sig.score > 0 ? '+' : ''}
            {sig.score} / 100
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-text-dim">
        <strong className="text-text-mute uppercase tracking-wider text-[10px]">Drivers</strong>
        <ul className="mt-1 space-y-0.5">
          {sig.drivers.map((dr, i) => (
            <li key={i}>· {dr}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
