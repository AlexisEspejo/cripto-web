'use client';
import { useMemo, useState } from 'react';
import { useKlines } from '@/hooks/useKlines';
import { useDisplayQuote } from '@/hooks/useDisplayQuote';
import { useUIStore } from '@/stores/ui-store';
import { analyseAdvanced } from '@/lib/projections';
import { deriveProjection, type PatternMeta } from '@/lib/pattern-projections';
import { ASSETS, type AssetSpec } from '@/lib/asset-registry';
import { PatternIllustration } from './PatternIllustration';
import { fmtPct } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  asset?: AssetSpec;
}

export function PatternsPanel({ asset = ASSETS.BTC! }: Props) {
  const { data: klines } = useKlines('1d', asset.id);
  const dq = useDisplayQuote();
  const overlayEnabled = useUIStore(s => s.patternOverlayEnabled);
  const setOverlay = useUIStore(s => s.setPatternOverlay);
  const [showProjection, setShowProjection] = useState(false);

  const projection = useMemo(() => {
    if (!klines || klines.length < 60) return null;
    const adv = analyseAdvanced(klines, '1d', 60);
    if (!adv) return null;
    return deriveProjection({
      lastPrice: adv.lastPrice,
      support: adv.support,
      resistance: adv.resistance,
      patterns: adv.patterns,
      trend: adv.trend,
    });
  }, [klines]);

  if (!projection) {
    return (
      <section className="border-b border-border-strong px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
            § Patrones técnicos
          </div>
          <h2 className="title-serif mt-1 text-2xl">
            Estructura del <em>gráfico</em>
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skeleton h-24 rounded-sm" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const detected = projection.patterns.filter(p => p.detected);
  const undetected = projection.patterns.filter(p => !p.detected);

  const dirColor =
    projection.direction === 'bullish'
      ? 'text-up'
      : projection.direction === 'bearish'
      ? 'text-down'
      : 'text-warn';

  const dirLabel =
    projection.direction === 'bullish'
      ? 'ALCISTA'
      : projection.direction === 'bearish'
      ? 'BAJISTA'
      : 'NEUTRAL';

  const handleProject = () => {
    setShowProjection(true);
    setOverlay(true);
  };

  return (
    <section className="border-b border-border-strong px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
              § Patrones técnicos detectados
            </div>
            <h2 className="title-serif mt-1 text-2xl">
              Estructura del <em>gráfico</em>
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-dim">
              Detección automática sobre las últimas 60 velas diarias. Pasa el
              cursor sobre cada patrón para ver el esquema y su implicación, o
              proyecta la suma de patrones sobre el chart.
            </p>
          </div>
          <button
            type="button"
            onClick={handleProject}
            className={cn(
              'rounded-sm border px-4 py-2 text-xs uppercase tracking-wider transition-colors',
              showProjection || overlayEnabled
                ? 'border-brand bg-brand text-bg font-semibold'
                : 'border-border-strong bg-bg-card text-text-dim hover:border-brand hover:text-brand',
            )}
            aria-pressed={showProjection || overlayEnabled}
          >
            {showProjection ? '◆ Proyección activa' : '▸ Mostrar proyección'}
          </button>
        </div>

        {/* Detected patterns */}
        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-widest text-text-mute mb-2">
            Detectados ({detected.length})
          </div>
          {detected.length === 0 ? (
            <div className="rounded-sm border border-border-strong bg-bg-card px-4 py-3 text-sm text-text-dim">
              Sin patrones reconocibles en la ventana actual.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {detected.map(p => (
                <PatternCard key={p.key} pattern={p} />
              ))}
            </div>
          )}
        </div>

        {/* Undetected — collapsed pills */}
        {undetected.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-widest text-text-mute mb-2">
              No detectados
            </div>
            <div className="flex flex-wrap gap-2">
              {undetected.map(p => (
                <PatternCard key={p.key} pattern={p} compact />
              ))}
            </div>
          </div>
        )}

        {/* Projection block — visible after pressing the button */}
        {showProjection && (
          <div className="mt-8 rounded-sm border border-brand bg-bg-card overflow-hidden">
            <div className="border-b border-border-strong bg-gradient-to-r from-brand/10 to-transparent px-5 py-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-brand">
                  Proyección agregada · derivada de los patrones
                </div>
                <div className="title-serif text-xl mt-1">
                  Bias <em className={dirColor}>{dirLabel}</em>{' '}
                  <span className="text-text-mute text-sm not-italic ml-1">
                    confianza {(projection.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProjection(false);
                  setOverlay(false);
                }}
                className="text-[10px] uppercase tracking-wider text-text-mute hover:text-text"
              >
                Ocultar
              </button>
            </div>

            <div className="grid gap-px bg-border lg:grid-cols-3">
              <ProjectionBox
                label="Precio actual"
                value={dq.formatForAsset(projection.lastPrice, asset)}
                hint="Referencia para los siguientes niveles"
              />
              <ProjectionBox
                label={projection.direction === 'bearish' ? 'Target (bajada)' : 'Target'}
                value={dq.formatForAsset(projection.target, asset)}
                pct={projection.targetPct}
                tone={projection.direction === 'bullish' ? 'up' : projection.direction === 'bearish' ? 'down' : 'warn'}
                hint={
                  projection.direction === 'bullish'
                    ? 'Resistencia Donchian + extensión por HH/HL'
                    : projection.direction === 'bearish'
                    ? 'Soporte Donchian + extensión por LH/LL'
                    : 'Mean reversion a la mitad del rango'
                }
              />
              <ProjectionBox
                label="Stop / invalidación"
                value={dq.formatForAsset(projection.stop, asset)}
                pct={projection.stopPct}
                tone={projection.direction === 'bullish' ? 'down' : 'up'}
                hint="Si el precio cruza este nivel, el patrón se invalida"
              />
            </div>

            <div className="px-5 py-4 border-t border-border-strong">
              <div className="text-[10px] uppercase tracking-widest text-text-mute mb-2">
                Razonamiento
              </div>
              <ul className="space-y-1 text-sm text-text-dim">
                {projection.rationale.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] italic text-text-mute">
                La proyección se calcula combinando los patrones detectados, la
                tendencia y el canal Donchian de 30 velas. {overlayEnabled ? 'Las líneas de target y stop se dibujan en el chart de precio más abajo.' : ''} <strong className="text-text-dim">No es asesoría financiera.</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PatternCard({ pattern, compact }: { pattern: PatternMeta; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const toneBg =
    pattern.tone === 'bullish'
      ? 'border-up/40 hover:border-up'
      : pattern.tone === 'bearish'
      ? 'border-down/40 hover:border-down'
      : 'border-warn/40 hover:border-warn';
  const toneText =
    pattern.tone === 'bullish' ? 'text-up' : pattern.tone === 'bearish' ? 'text-down' : 'text-warn';

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] text-text-mute',
          'border-border-strong',
        )}
        title={pattern.description}
      >
        <span className="opacity-60">
          <PatternIllustration pattern={pattern.key} size="sm" detected={false} />
        </span>
        <span>{pattern.name}</span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-sm border bg-bg-card p-3 transition-colors cursor-help',
        pattern.detected ? toneBg : 'border-border-strong opacity-60',
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs font-medium', pattern.detected ? 'text-text' : 'text-text-mute')}>
          {pattern.name}
        </span>
        {pattern.detected && (
          <span className={cn('text-[10px] uppercase tracking-wider', toneText)}>
            {pattern.tone === 'bullish' ? '↑' : pattern.tone === 'bearish' ? '↓' : '◆'}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-center bg-bg-elev rounded-sm py-2">
        <PatternIllustration pattern={pattern.key} size="sm" detected={pattern.detected} />
      </div>

      {/* Hover popover with larger SVG + descriptions */}
      {open && pattern.detected && (
        <div
          role="tooltip"
          className="absolute left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-sm border border-border-strong bg-bg-elev p-3 shadow-2xl pointer-events-none"
        >
          <div className="text-[10px] uppercase tracking-widest text-brand">
            Patrón
          </div>
          <div className="title-serif text-base mt-0.5">{pattern.name}</div>
          <div className="mt-2 flex items-center justify-center bg-bg-card rounded-sm py-2">
            <PatternIllustration pattern={pattern.key} size="lg" />
          </div>
          <p className="mt-2 text-[11px] text-text-dim leading-relaxed">
            {pattern.description}
          </p>
          <p className={cn('mt-1.5 text-[11px] font-medium', toneText)}>
            → {pattern.implication}
          </p>
        </div>
      )}
    </div>
  );
}

function ProjectionBox({
  label,
  value,
  hint,
  pct,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  pct?: number;
  tone?: 'up' | 'down' | 'warn';
}) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : tone === 'warn' ? 'text-warn' : 'text-text';
  return (
    <div className="bg-bg-card px-5 py-4">
      <div className="text-[10px] uppercase tracking-widest text-text-mute">{label}</div>
      <div className={cn('mt-1.5 text-2xl font-semibold tabular-nums', color)}>{value}</div>
      {pct != null && (
        <div className={cn('text-sm tabular-nums', color)}>{fmtPct(pct)}</div>
      )}
      <div className="mt-2 text-[11px] italic text-text-mute leading-snug">{hint}</div>
    </div>
  );
}
