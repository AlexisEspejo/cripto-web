'use client';
import { useMemo, useState } from 'react';
import { TopBar } from '@/components/terminal/TopBar';
import { Footer } from '@/components/terminal/Footer';
import { VerdictPanel } from '@/components/terminal/VerdictPanel';
import { IndicatorsGrid } from '@/components/terminal/IndicatorsGrid';
import { ProjectionChart } from '@/components/projections/ProjectionChart';
import { useKlines } from '@/hooks/useKlines';
import { useMarkets } from '@/hooks/useMarkets';
import { useNews } from '@/hooks/useNews';
import { useFxRate } from '@/hooks/useFxRate';
import {
  analyseAdvanced,
  monteCarloProjection,
  simulateScenario,
  STEPS_PER_YEAR,
  type AdvancedAnalysis,
  type MonteCarloResult,
} from '@/lib/projections';
import { ASSETS, buildCryptoSpec, type AssetSpec } from '@/lib/asset-registry';
import { cn } from '@/lib/utils';
import type { KlineInterval } from '@/lib/types';

type Quote = 'USD' | 'EUR';

const HORIZONS_BY_TF: Record<KlineInterval, Array<{ label: string; steps: number }>> = {
  '1h': [
    { label: '12 h', steps: 12 },
    { label: '24 h', steps: 24 },
    { label: '3 d', steps: 72 },
    { label: '7 d', steps: 168 },
  ],
  '4h': [
    { label: '3 d', steps: 18 },
    { label: '7 d', steps: 42 },
    { label: '30 d', steps: 180 },
    { label: '90 d', steps: 540 },
  ],
  '1d': [
    { label: '7 d', steps: 7 },
    { label: '30 d', steps: 30 },
    { label: '90 d', steps: 90 },
    { label: '180 d', steps: 180 },
    { label: '365 d', steps: 365 },
  ],
  '1w': [
    { label: '4 sem', steps: 4 },
    { label: '12 sem', steps: 12 },
    { label: '26 sem', steps: 26 },
    { label: '52 sem', steps: 52 },
  ],
};

const TIMEFRAMES: KlineInterval[] = ['1h', '4h', '1d', '1w'];
const PATHS = 1500;

export default function ProjectionsPage() {
  const markets = useMarkets(20);
  const fx = useFxRate();
  const [assetId, setAssetId] = useState<string>('BTC');
  const [interval, setIntervalTf] = useState<KlineInterval>('1d');
  const [horizonSteps, setHorizonSteps] = useState(30);
  const [investment, setInvestment] = useState(1000);
  const [quote, setQuote] = useState<Quote>('USD');
  const [useSentiment, setUseSentiment] = useState(true);

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

  const news = useNews(asset.hasNews);
  const klines = useKlines(interval, asset.id);

  const analysis: AdvancedAnalysis | null = useMemo(() => {
    if (!klines.data || klines.data.length < 60) return null;
    return analyseAdvanced(klines.data, interval, 60);
  }, [klines.data, interval]);

  const projection: MonteCarloResult = useMemo(() => {
    if (!klines.data) return { bands: [], probabilityOfProfit: 0.5, expectedPathDrawdown: 0, stepsPerYear: STEPS_PER_YEAR[interval] };
    const sentimentNetScore = useSentiment && asset.hasNews && news.data ? news.data.aggregate.netScore : null;
    return monteCarloProjection(klines.data, interval, horizonSteps, PATHS, {
      sentimentNetScore,
      sentimentWeight: 0.4,
    });
  }, [klines.data, interval, horizonSteps, useSentiment, asset.hasNews, news.data]);

  // Currency conversion factor for displaying investment + scenario values.
  // The asset price is in USD; toEur = price * (1/EURUSD).
  const fxRate = fx.data?.price ?? 1; // USD per EUR
  const toQuote = (usdValue: number): number => (quote === 'EUR' && fxRate > 0 ? usdValue / fxRate : usdValue);
  const fromQuoteToUsd = (v: number): number => (quote === 'EUR' && fxRate > 0 ? v * fxRate : v);

  const scenario = useMemo(() => {
    if (projection.bands.length === 0 || !analysis) return null;
    // Convert the user's input (in the chosen quote) back to USD for the qty calc.
    const investedUsd = fromQuoteToUsd(investment);
    return simulateScenario(projection.bands, investedUsd, analysis.lastPrice, horizonSteps);
  }, [projection, analysis, investment, horizonSteps, quote, fxRate]); // eslint-disable-line react-hooks/exhaustive-deps

  const assetOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; label: string }[] = [];
    result.push({ id: 'BTC', label: 'BTC · Bitcoin' });
    result.push({ id: 'ETH', label: 'ETH · Ethereum' });
    result.push({ id: 'EURUSD', label: 'EUR/USD · Forex' });
    result.push({ id: 'USDEUR', label: 'USD/EUR · Forex (inverso)' });
    for (const k of result) seen.add(k.id);
    for (const m of markets.data?.items ?? []) {
      if (seen.has(m.symbol)) continue;
      seen.add(m.symbol);
      result.push({ id: m.symbol, label: `${m.symbol} · ${m.name}` });
    }
    return result;
  }, [markets.data]);

  // Reset horizon when timeframe changes if current value isn't valid
  const horizonOptions = HORIZONS_BY_TF[interval];
  const safeHorizon = horizonOptions.find(h => h.steps === horizonSteps)?.steps ?? horizonOptions[1]!.steps;
  if (safeHorizon !== horizonSteps) {
    // align in next render — use setState guard via setTimeout (rare path)
    setTimeout(() => setHorizonSteps(safeHorizon), 0);
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <TopBar asset={asset} />

      <section className="border-b border-border-strong px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
            § Proyecciones · Monte Carlo + análisis robusto
          </div>
          <h1 className="title-serif mt-2 text-3xl sm:text-4xl">
            ¿Qué pasaría <em>si compro</em>?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-dim">
            Modelo GBM con 1500 caminos sobre retornos logarítmicos del timeframe
            seleccionado. Métricas robustas (Sharpe, Sortino, max DD, VaR/CVaR,
            Hurst, skew/kurt), análisis de patrones (HH/LL, Bollinger squeeze,
            divergencia RSI) y sesgo opcional de sentiment narrativo.
          </p>

          {/* Controls row 1 */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

            <Control label="Timeframe (frecuencia)">
              <div className="flex gap-1">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setIntervalTf(tf)}
                    className={cn(
                      'flex-1 rounded-sm border px-2 py-1.5 text-xs uppercase tracking-wider transition-colors',
                      interval === tf
                        ? 'border-brand bg-brand text-bg font-semibold'
                        : 'border-border-strong bg-bg-elev text-text-dim hover:text-text',
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </Control>

            <Control label="Horizonte de inversión">
              <div className="flex flex-wrap gap-1">
                {horizonOptions.map(h => (
                  <button
                    key={h.steps}
                    type="button"
                    onClick={() => setHorizonSteps(h.steps)}
                    className={cn(
                      'rounded-sm border px-2 py-1.5 text-xs uppercase tracking-wider transition-colors',
                      horizonSteps === h.steps
                        ? 'border-brand bg-brand text-bg font-semibold'
                        : 'border-border-strong bg-bg-elev text-text-dim hover:text-text',
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </Control>

            <Control label="Moneda de inversión">
              <div className="flex gap-1">
                {(['USD', 'EUR'] as Quote[]).map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuote(q)}
                    className={cn(
                      'flex-1 rounded-sm border px-2 py-1.5 text-xs uppercase tracking-wider transition-colors',
                      quote === q
                        ? 'border-brand bg-brand text-bg font-semibold'
                        : 'border-border-strong bg-bg-elev text-text-dim hover:text-text',
                    )}
                    title={fx.data ? `EUR/USD ${fx.data.price.toFixed(4)}` : ''}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </Control>
          </div>

          {/* Controls row 2: investment + sentiment toggle */}
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto]">
            <Control label={`Monto a invertir (${quote})`}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute">
                  {quote === 'EUR' ? '€' : '$'}
                </span>
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={investment}
                  onChange={e => setInvestment(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full appearance-none rounded-sm border border-border-strong bg-bg-elev pl-7 pr-3 py-2 text-sm tabular-nums text-text focus:border-brand focus:outline-none"
                />
              </div>
            </Control>

            <div className="flex items-end">
              <label
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-sm border bg-bg-card px-4 py-2.5 cursor-pointer transition-colors',
                  useSentiment ? 'border-brand' : 'border-border-strong',
                  !asset.hasNews && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-text-mute">
                    Sesgo de sentiment
                  </div>
                  <div className="text-xs text-text-dim mt-0.5">
                    {asset.hasNews
                      ? 'Aplicar netScore de noticias al drift del modelo (peso 0.4σ)'
                      : 'No disponible para forex'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useSentiment && asset.hasNews}
                  onChange={e => setUseSentiment(e.target.checked)}
                  disabled={!asset.hasNews}
                  className="h-4 w-4 accent-brand"
                />
              </label>
            </div>
          </div>

          {/* News sentiment panel */}
          {asset.hasNews && (
            <NewsSentimentBanner news={news.data} />
          )}

          {/* Advanced metrics grid */}
          {analysis && (
            <MetricsGrid analysis={analysis} interval={interval} asset={asset} quote={quote} toQuote={toQuote} />
          )}

          {/* Chart */}
          <div className="mt-8 rounded-sm border border-border-strong bg-bg-card p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
                  Patrón histórico + proyección Monte Carlo · {interval.toUpperCase()}
                </div>
                <div className="title-serif mt-1 text-xl">
                  {asset.name} · próximos{' '}
                  {horizonOptions.find(h => h.steps === horizonSteps)?.label ?? `${horizonSteps} pasos`}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-text-mute uppercase tracking-wider text-[10px]">
                    Prob. profit
                  </span>
                  <span
                    className={cn(
                      'tabular-nums font-semibold text-base',
                      projection.probabilityOfProfit >= 0.55
                        ? 'text-up'
                        : projection.probabilityOfProfit <= 0.45
                        ? 'text-down'
                        : 'text-warn',
                    )}
                  >
                    {(projection.probabilityOfProfit * 100).toFixed(1)}%
                  </span>
                </div>
                <Legend />
              </div>
            </div>
            {klines.data ? (
              <ProjectionChart
                history={klines.data.slice(-Math.min(180, klines.data.length))}
                bands={projection.bands}
                trend={analysis}
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
                quote={quote}
                value={toQuote(scenario.expectedValue)}
                pct={scenario.expectedReturnPct}
                detail={`${scenario.qty.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${asset.symbol} a ${formatPrice(asset, analysis?.lastPrice ?? 0)}`}
              />
              <ScenarioCard
                label="Escenario alcista (P95)"
                tone="up"
                quote={quote}
                value={toQuote(scenario.bestCase)}
                pct={scenario.bestReturnPct}
                detail="5 % de las simulaciones supera este valor."
              />
              <ScenarioCard
                label="Escenario bajista (P5)"
                tone="down"
                quote={quote}
                value={toQuote(scenario.worstCase)}
                pct={scenario.worstReturnPct}
                detail={`Drawdown promedio del camino: ${projection.expectedPathDrawdown.toFixed(1)} %`}
              />
            </div>
          )}

          <p className="mt-6 text-[11px] italic text-text-mute leading-relaxed">
            <strong className="text-text-dim">Importante:</strong> El modelo
            asume que los retornos futuros se distribuyen como los pasados
            (movimiento Browniano geométrico). En cripto eso falla en crashes,
            halvings o eventos macro extremos — kurtosis y skewness te dicen
            cuán lejos del modelo está la realidad. Trata las bandas como
            <em> rango de plausibilidad estadística</em>, no como predicción.
          </p>
        </div>
      </section>

      <VerdictPanel asset={asset} />
      <IndicatorsGrid asset={asset} />

      <Footer />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-text-mute mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function NewsSentimentBanner({
  news,
}: {
  news: { aggregate: { bull: number; bear: number; neutral: number; netScore: number } } | undefined;
}) {
  if (!news) {
    return (
      <div className="mt-6 rounded-sm border border-border-strong bg-bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-text-mute">Sentiment de noticias</div>
        <div className="skeleton mt-2 h-6 w-40" />
      </div>
    );
  }
  const { netScore, bull, bear, neutral } = news.aggregate;
  const tone = netScore > 10 ? 'up' : netScore < -10 ? 'down' : 'warn';
  const label =
    netScore > 20 ? 'NETO BULLISH' : netScore > 5 ? 'LIGERAMENTE BULLISH' :
    netScore < -20 ? 'NETO BEARISH' : netScore < -5 ? 'LIGERAMENTE BEARISH' :
    'NEUTRAL';
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr_auto] items-center rounded-sm border border-border-strong bg-bg-card p-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-mute">Sentiment narrativo</div>
        <div className={cn('mt-1 text-2xl font-semibold tabular-nums',
          tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-warn')}>
          {netScore > 0 ? '+' : ''}{netScore}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-text-dim mt-0.5">{label}</div>
      </div>
      <div className="relative h-2 w-full overflow-hidden bg-bg-elev rounded-sm">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
        <div
          className={cn('absolute inset-y-0',
            netScore > 0 ? 'bg-up' : netScore < 0 ? 'bg-down' : 'bg-warn')}
          style={{
            left: netScore >= 0 ? '50%' : `${50 - Math.abs(netScore) / 2}%`,
            width: `${Math.abs(netScore) / 2}%`,
          }}
        />
      </div>
      <div className="flex gap-4 text-xs tabular-nums">
        <span className="text-up">↑ {bull}</span>
        <span className="text-warn">◆ {neutral}</span>
        <span className="text-down">↓ {bear}</span>
      </div>
    </div>
  );
}

function MetricsGrid({
  analysis,
  interval,
  asset,
  quote,
  toQuote,
}: {
  analysis: AdvancedAnalysis;
  interval: KlineInterval;
  asset: AssetSpec;
  quote: Quote;
  toQuote: (v: number) => number;
}) {
  const trendTone =
    analysis.trend === 'alcista' ? 'up' : analysis.trend === 'bajista' ? 'down' : 'warn';
  const sharpeTone = analysis.sharpe >= 1 ? 'up' : analysis.sharpe <= 0 ? 'down' : 'warn';
  const sortinoTone = analysis.sortino >= 1.5 ? 'up' : analysis.sortino <= 0 ? 'down' : 'warn';
  const ddTone = analysis.maxDrawdownPct < -50 ? 'down' : analysis.maxDrawdownPct < -25 ? 'warn' : 'neutral';
  const winTone = analysis.winRatePct >= 55 ? 'up' : analysis.winRatePct <= 45 ? 'down' : 'warn';
  const hurstTone =
    analysis.hurst > 0.55 ? 'up' : analysis.hurst < 0.45 ? 'warn' : 'neutral';

  return (
    <div className="mt-8 space-y-6">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
          § Análisis robusto · ventana 60 velas
        </div>
        <h2 className="title-serif mt-1 text-2xl">
          Métricas <em>estadísticas</em> sobre {interval.toUpperCase()}
        </h2>
      </div>

      {/* Group 1: Trend & structure */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Tendencia"
          value={analysis.trend.toUpperCase()}
          tone={trendTone}
          hint={`R² ${analysis.r2.toFixed(2)} · fuerza ${analysis.strength}`}
        />
        <MetricCard
          label="Pendiente"
          value={`${analysis.slopePctPerStep >= 0 ? '+' : ''}${analysis.slopePctPerStep.toFixed(3)} %`}
          tone={analysis.slopePctPerStep >= 0 ? 'up' : 'down'}
          hint={`Por vela ${interval} · regresión lineal`}
        />
        <MetricCard
          label="Return anualizado"
          value={`${analysis.annualisedReturnPct >= 0 ? '+' : ''}${analysis.annualisedReturnPct.toFixed(1)} %`}
          tone={analysis.annualisedReturnPct >= 0 ? 'up' : 'down'}
          hint={`Compuesto · ${analysis.stepsPerYear} pasos/año`}
        />
        <MetricCard
          label="Volatilidad anualizada"
          value={`${analysis.annualisedVolPct.toFixed(1)} %`}
          tone={analysis.volatilityRegime > 1.2 ? 'warn' : 'neutral'}
          hint={`Régimen ATR ${analysis.volatilityRegime.toFixed(2)}× · ${analysis.regimeLabel}`}
        />
      </div>

      {/* Group 2: Risk-adjusted + drawdown */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Sharpe ratio"
          value={analysis.sharpe.toFixed(2)}
          tone={sharpeTone}
          hint={
            analysis.sharpe >= 1
              ? 'Retorno bien compensado por riesgo'
              : analysis.sharpe <= 0
              ? 'Retorno negativo neto'
              : 'Compensación pobre vs vol'
          }
        />
        <MetricCard
          label="Sortino ratio"
          value={analysis.sortino.toFixed(2)}
          tone={sortinoTone}
          hint="Sharpe usando solo desviación a la baja"
        />
        <MetricCard
          label="Max Drawdown"
          value={`${analysis.maxDrawdownPct.toFixed(1)} %`}
          tone={ddTone}
          hint={`DD actual ${analysis.currentDrawdownPct.toFixed(1)} %`}
        />
        <MetricCard
          label="Win rate"
          value={`${analysis.winRatePct.toFixed(1)} %`}
          tone={winTone}
          hint="% de períodos con retorno positivo"
        />
      </div>

      {/* Group 3: Tail risk + structure */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="VaR 95 %"
          value={`${analysis.var95Pct.toFixed(2)} %`}
          tone="down"
          hint={`Por ${interval} · 5 % peor caso`}
        />
        <MetricCard
          label="CVaR 95 % (Expected Shortfall)"
          value={`${analysis.cvar95Pct.toFixed(2)} %`}
          tone="down"
          hint="Pérdida esperada en cola"
        />
        <MetricCard
          label="Hurst exponent"
          value={analysis.hurst.toFixed(2)}
          tone={hurstTone}
          hint={
            analysis.hurst > 0.55
              ? 'Tendencial · persistente'
              : analysis.hurst < 0.45
              ? 'Mean-reverting'
              : 'Random walk'
          }
        />
        <MetricCard
          label="Skew / Kurtosis"
          value={`${analysis.skewness >= 0 ? '+' : ''}${analysis.skewness.toFixed(2)} / ${analysis.kurtosis.toFixed(1)}`}
          tone="neutral"
          hint={
            analysis.kurtosis > 3
              ? 'Colas pesadas · riesgo extremo elevado'
              : 'Distribución cercana a normal'
          }
        />
      </div>

      {/* Group 4: Levels + patterns */}
      <div className="grid gap-3 lg:grid-cols-2">
        <MetricCard
          label="Donchian 30 · soporte / resistencia"
          value={`${formatPrice(asset, analysis.support)} – ${formatPrice(asset, analysis.resistance)}`}
          tone="neutral"
          hint={`Distancia al techo: ${(((analysis.resistance - analysis.lastPrice) / analysis.lastPrice) * 100).toFixed(2)} %  ·  al suelo: ${(((analysis.lastPrice - analysis.support) / analysis.lastPrice) * 100).toFixed(2)} %`}
        />
        <PatternsCard patterns={analysis.patterns} />
      </div>
      <div className="text-[11px] italic text-text-mute">
        {quote === 'EUR' ? (
          <>Valores monetarios se muestran en EUR usando la cotización spot EUR/USD = {toQuote(1).toFixed(4)} (inversa).</>
        ) : (
          <>Valores monetarios se muestran en USD (cotización nativa del activo).</>
        )}
      </div>
    </div>
  );
}

function MetricCard({
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

function PatternsCard({ patterns: p }: { patterns: AdvancedAnalysis['patterns'] }) {
  const items: Array<{ label: string; on: boolean; bull?: boolean }> = [
    { label: 'Higher Highs', on: p.higherHighs, bull: true },
    { label: 'Higher Lows', on: p.higherLows, bull: true },
    { label: 'Lower Highs', on: p.lowerHighs, bull: false },
    { label: 'Lower Lows', on: p.lowerLows, bull: false },
    { label: 'Bollinger squeeze', on: p.bollingerSqueeze, bull: undefined },
  ];
  return (
    <article className="rounded-sm border border-border-strong bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-text-mute">Patrones detectados</div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {items.map(it => (
          <li
            key={it.label}
            className={cn(
              'flex items-center justify-between gap-2',
              it.on ? 'text-text' : 'text-text-mute line-through',
            )}
          >
            <span>{it.label}</span>
            <span
              className={cn(
                'text-[10px] uppercase tracking-wider',
                it.on && it.bull === true && 'text-up',
                it.on && it.bull === false && 'text-down',
                it.on && it.bull === undefined && 'text-warn',
              )}
            >
              {it.on ? 'sí' : 'no'}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2 text-text">
          <span>Cruces MACD</span>
          <span className="tabular-nums">{p.macdCrosses}</span>
        </li>
        <li className="flex items-center justify-between gap-2 text-text">
          <span>Divergencia RSI</span>
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider',
              p.rsiDivergence === 'bullish' && 'text-up',
              p.rsiDivergence === 'bearish' && 'text-down',
              !p.rsiDivergence && 'text-text-mute',
            )}
          >
            {p.rsiDivergence ?? 'ninguna'}
          </span>
        </li>
      </ul>
    </article>
  );
}

function ScenarioCard({
  label,
  value,
  pct,
  detail,
  tone,
  quote,
}: {
  label: string;
  value: number;
  pct: number;
  detail: string;
  tone: 'up' | 'down' | 'neutral';
  quote: Quote;
}) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-warn';
  const border =
    tone === 'up' ? 'border-up/40' : tone === 'down' ? 'border-down/40' : 'border-border-strong';
  const symbol = quote === 'EUR' ? '€' : '$';
  return (
    <article className={cn('rounded-sm border bg-bg-card p-5', border)}>
      <div className="text-[10px] uppercase tracking-widest text-text-mute">{label}</div>
      <div className={cn('mt-2 text-3xl font-semibold tabular-nums', color)}>
        {symbol}
        {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
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

function formatPrice(asset: AssetSpec, v: number): string {
  if (asset.decimals === 0) return '$' + Math.round(v).toLocaleString('en-US');
  return (
    '$' +
    v.toLocaleString('en-US', {
      minimumFractionDigits: asset.decimals,
      maximumFractionDigits: asset.decimals,
    })
  );
}
