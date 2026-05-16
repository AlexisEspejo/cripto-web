'use client';
import { useMemo, useState } from 'react';
import { TopBar } from '@/components/terminal/TopBar';
import { Footer } from '@/components/terminal/Footer';
import { VerdictPanel } from '@/components/terminal/VerdictPanel';
import { IndicatorsGrid } from '@/components/terminal/IndicatorsGrid';
import { ProjectionChart } from '@/components/projections/ProjectionChart';
import { useKlines } from '@/hooks/useKlines';
import { useMarkets } from '@/hooks/useMarkets';
import {
  analyseTrend,
  monteCarloBands,
  simulateScenario,
  type MonteCarloBand,
} from '@/lib/projections';
import {
  ASSETS,
  buildCryptoSpec,
  type AssetSpec,
} from '@/lib/asset-registry';
import { cn } from '@/lib/utils';

const HORIZONS: { label: string; days: number }[] = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '180 días', days: 180 },
  { label: '365 días', days: 365 },
];

const PATHS = 1000;

export default function ProjectionsPage() {
  const markets = useMarkets(20);
  const [assetId, setAssetId] = useState<string>('BTC');
  const [horizonDays, setHorizonDays] = useState(30);
  const [investment, setInvestment] = useState(1000);

  // Resolve the AssetSpec from the registry first, then fall back to the
  // markets API result (so we get the right symbol mapping).
  const asset: AssetSpec = useMemo(() => {
    const fromRegistry = ASSETS[assetId.toUpperCase()];
    if (fromRegistry) return fromRegistry;
    const m = markets.data?.items.find(x => x.symbol === assetId.toUpperCase());
    if (m) {
      const decimals = m.currentPrice >= 100 ? 0 : m.currentPrice >= 1 ? 2 : 4;
      return buildCryptoSpec(m.symbol, m.name, m.id, decimals);
    }
    return ASSETS.BTC!;
  }, [assetId, markets.data]);

  const klines = useKlines('1d', asset.id);

  const { bands, trend, lastPrice } = useMemo(() => {
    if (!klines.data || klines.data.length < 60)
      return { bands: [] as MonteCarloBand[], trend: null, lastPrice: 0 };
    const closes = klines.data.map(k => k.close);
    const lp = closes[closes.length - 1] ?? 0;
    const steps = Math.min(365, horizonDays);
    return {
      bands: monteCarloBands(closes, steps, PATHS),
      trend: analyseTrend(klines.data, 60),
      lastPrice: lp,
    };
  }, [klines.data, horizonDays]);

  const scenario = useMemo(() => {
    if (bands.length === 0 || lastPrice === 0) return null;
    return simulateScenario(bands, investment, lastPrice, horizonDays);
  }, [bands, investment, lastPrice, horizonDays]);

  const assetOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; label: string }[] = [];
    // Curated front
    result.push({ id: 'BTC', label: 'BTC · Bitcoin' });
    result.push({ id: 'ETH', label: 'ETH · Ethereum' });
    result.push({ id: 'EURUSD', label: 'EUR/USD · Forex' });
    result.push({ id: 'USDEUR', label: 'USD/EUR · Forex (inverso)' });
    seen.add('BTC');
    seen.add('ETH');
    seen.add('EURUSD');
    seen.add('USDEUR');
    for (const m of markets.data?.items ?? []) {
      if (seen.has(m.symbol)) continue;
      seen.add(m.symbol);
      result.push({ id: m.symbol, label: `${m.symbol} · ${m.name}` });
    }
    return result;
  }, [markets.data]);

  return (
    <main className="min-h-screen bg-bg text-text">
      <TopBar asset={asset} />

      <section className="border-b border-border-strong px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
            § Proyecciones · Monte Carlo + análisis de tendencia
          </div>
          <h1 className="title-serif mt-2 text-3xl sm:text-4xl">
            ¿Qué pasaría <em>si compro</em>?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-dim">
            Elige cripto u par FX, define horizonte y monto. Simulamos 1 000
            caminos de precio futuros usando los retornos logarítmicos
            históricos (GBM), calculamos los percentiles 5/25/50/75/95 y
            mostramos qué le pasaría a tu inversión en cada escenario. Todo
            sobre el mismo análisis técnico de los 10 indicadores + sentiment.
          </p>

          {/* Controls */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Control label="Activo">
              <select
                value={assetId}
                onChange={e => setAssetId(e.target.value)}
                className="w-full appearance-none rounded-sm border border-border-strong bg-bg-elev px-3 py-2 text-sm text-text focus:border-brand focus:outline-none"
              >
                {assetOptions.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Control>
            <Control label="Horizonte de inversión">
              <div className="flex flex-wrap gap-1">
                {HORIZONS.map(h => (
                  <button
                    key={h.days}
                    type="button"
                    onClick={() => setHorizonDays(h.days)}
                    className={cn(
                      'rounded-sm border px-2.5 py-1.5 text-xs uppercase tracking-wider transition-colors',
                      horizonDays === h.days
                        ? 'border-brand bg-brand text-bg'
                        : 'border-border-strong bg-bg-elev text-text-dim hover:text-text',
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </Control>
            <Control label={`Monto a invertir (${asset.quote})`}>
              <input
                type="number"
                min={1}
                step={100}
                value={investment}
                onChange={e => setInvestment(Math.max(1, Number(e.target.value) || 0))}
                className="w-full appearance-none rounded-sm border border-border-strong bg-bg-elev px-3 py-2 text-sm tabular-nums text-text focus:border-brand focus:outline-none"
              />
            </Control>
          </div>

          {/* Trend analysis */}
          {trend && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TrendCard
                label="Tendencia"
                value={trend.trend.toUpperCase()}
                tone={
                  trend.trend === 'alcista'
                    ? 'up'
                    : trend.trend === 'bajista'
                    ? 'down'
                    : 'warn'
                }
                hint={`R² ${trend.r2.toFixed(2)} · fuerza ${trend.strength}`}
              />
              <TrendCard
                label="Pendiente"
                value={`${trend.slopePct >= 0 ? '+' : ''}${trend.slopePct.toFixed(3)} %/día`}
                tone={trend.slopePct >= 0 ? 'up' : 'down'}
                hint="Regresión lineal sobre últimas 60 velas"
              />
              <TrendCard
                label="Volatilidad"
                value={`${trend.annualisedVolPct.toFixed(1)} %`}
                tone={trend.volatilityRegime > 1.2 ? 'warn' : 'neutral'}
                hint={`Régimen ATR ${trend.volatilityRegime.toFixed(2)}× · anualizada`}
              />
              <TrendCard
                label="Soporte / Resistencia"
                value={`${formatNum(trend.support, asset.decimals)} – ${formatNum(trend.resistance, asset.decimals)}`}
                tone="neutral"
                hint="Donchian 30 velas"
              />
            </div>
          )}

          {/* Chart */}
          <div className="mt-8 rounded-sm border border-border-strong bg-bg-card p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
                  Patrón histórico + proyección Monte Carlo
                </div>
                <div className="title-serif mt-1 text-xl">
                  {asset.name} · próximos {horizonDays} días
                </div>
              </div>
              <Legend />
            </div>
            {klines.data ? (
              <ProjectionChart
                history={klines.data.slice(-Math.min(180, klines.data.length))}
                bands={bands}
                trend={trend}
                assetLabel={asset.symbol}
              />
            ) : (
              <div className="skeleton h-[420px] w-full" />
            )}
          </div>

          {/* Scenario summary */}
          {scenario && (
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <ScenarioCard
                label="Escenario base (P50)"
                tone="neutral"
                value={formatMoney(scenario.expectedValue, asset.quote)}
                pct={scenario.expectedReturnPct}
                detail={`Comprando ${scenario.qty.toLocaleString('en-US', {
                  maximumFractionDigits: 6,
                })} ${asset.symbol} a ${formatNum(lastPrice, asset.decimals)}`}
              />
              <ScenarioCard
                label="Escenario alcista (P95)"
                tone="up"
                value={formatMoney(scenario.bestCase, asset.quote)}
                pct={scenario.bestReturnPct}
                detail="Cola superior · 5 % de las simulaciones supera este valor."
              />
              <ScenarioCard
                label="Escenario bajista (P5)"
                tone="down"
                value={formatMoney(scenario.worstCase, asset.quote)}
                pct={scenario.worstReturnPct}
                detail="Cola inferior · 5 % de las simulaciones cae por debajo."
              />
            </div>
          )}

          <p className="mt-6 text-[11px] italic text-text-mute leading-relaxed">
            <strong className="text-text-dim">Importante:</strong> El modelo
            Monte Carlo asume que los retornos futuros se distribuyen como los
            pasados (movimiento Browniano geométrico). En cripto eso falla en
            crashes, eventos macro y halvings. Trata las bandas como un
            <em> rango de plausibilidad</em>, no como una predicción.
          </p>
        </div>
      </section>

      {/* Reuse the existing analysis blocks below */}
      <VerdictPanel asset={asset} />
      <IndicatorsGrid asset={asset} />

      <Footer />
    </main>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-text-mute mb-2">{label}</span>
      {children}
    </label>
  );
}

function TrendCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: 'up' | 'down' | 'warn' | 'neutral';
  hint: string;
}) {
  const color =
    tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : tone === 'warn' ? 'text-warn' : 'text-text';
  return (
    <article className="rounded-sm border border-border-strong bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-text-mute">{label}</div>
      <div className={cn('mt-1.5 text-xl font-semibold tabular-nums leading-tight', color)}>
        {value}
      </div>
      <div className="mt-2 text-[11px] text-text-dim leading-snug">{hint}</div>
    </article>
  );
}

function ScenarioCard({
  label,
  value,
  pct,
  detail,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  detail: string;
  tone: 'up' | 'down' | 'neutral';
}) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-warn';
  const border =
    tone === 'up' ? 'border-up/40' : tone === 'down' ? 'border-down/40' : 'border-border-strong';
  return (
    <article className={cn('rounded-sm border bg-bg-card p-5', border)}>
      <div className="text-[10px] uppercase tracking-widest text-text-mute">{label}</div>
      <div className={cn('mt-2 text-3xl font-semibold tabular-nums', color)}>{value}</div>
      <div className={cn('mt-1 text-sm tabular-nums', color)}>
        {pct >= 0 ? '+' : ''}
        {pct.toFixed(2)} %
      </div>
      <p className="mt-3 text-[11px] italic text-text-mute">{detail}</p>
    </article>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-text-mute">
      <Item color="#f7931a" label="Histórico" />
      <Item color="#4a90e2" label="Regresión" dashed />
      <Item color="#00d68f" label="P50–P95" filled />
      <Item color="#ff4757" label="P5–P25" filled />
    </ul>
  );
}

function Item({ color, label, dashed, filled }: { color: string; label: string; dashed?: boolean; filled?: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-3.5"
        style={{
          background: filled ? `${color}33` : 'transparent',
          borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
        }}
      />
      <span>{label}</span>
    </li>
  );
}

function formatNum(v: number, decimals: number): string {
  if (decimals === 0) return '$' + Math.round(v).toLocaleString('en-US');
  return (
    '$' +
    v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

function formatMoney(v: number, quote: 'USD' | 'EUR'): string {
  const symbol = quote === 'EUR' ? '€' : '$';
  return (
    symbol +
    v.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
  );
}
