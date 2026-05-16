'use client';
import { useState } from 'react';
import { TopBar } from '@/components/terminal/TopBar';
import { PriceHero } from '@/components/terminal/PriceHero';
import { AlertsBar } from '@/components/terminal/AlertsBar';
import { VerdictPanel } from '@/components/terminal/VerdictPanel';
import { SignalsGrid } from '@/components/terminal/SignalsGrid';
import { IndicatorsGrid } from '@/components/terminal/IndicatorsGrid';
import { PatternsPanel } from '@/components/terminal/PatternsPanel';
import { PriceChart } from '@/components/terminal/PriceChart';
import { RSIChart } from '@/components/terminal/RSIChart';
import { Footer } from '@/components/terminal/Footer';
import { ASSETS } from '@/lib/asset-registry';
import { cn } from '@/lib/utils';

export default function EurUsdPage() {
  const [inverted, setInverted] = useState(false);
  const asset = inverted ? ASSETS.USDEUR! : ASSETS.EURUSD!;

  return (
    <main className="min-h-screen bg-bg text-text">
      <TopBar asset={asset} />
      <AlertsBar asset={asset} />

      <div className="border-b border-border-strong bg-bg-elev px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
              Forex · análisis bidireccional
            </div>
            <div className="title-serif text-lg mt-1">
              {asset.symbol}
              <span className="text-text-mute font-mono not-italic text-sm ml-2">
                ({asset.name})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-sm border border-border-strong bg-bg-card p-1">
            <button
              type="button"
              onClick={() => setInverted(false)}
              className={cn(
                'px-3 py-1.5 text-xs uppercase tracking-wider transition-colors',
                !inverted
                  ? 'bg-brand text-bg font-semibold'
                  : 'text-text-dim hover:text-text',
              )}
              aria-pressed={!inverted}
            >
              EUR → USD
            </button>
            <button
              type="button"
              onClick={() => setInverted(true)}
              className={cn(
                'px-3 py-1.5 text-xs uppercase tracking-wider transition-colors',
                inverted
                  ? 'bg-brand text-bg font-semibold'
                  : 'text-text-dim hover:text-text',
              )}
              aria-pressed={inverted}
            >
              USD → EUR
            </button>
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-[1400px] text-[11px] italic text-text-mute leading-relaxed">
          La dirección inversa muestra los mismos indicadores aplicados sobre la
          serie <code className="font-mono">1/precio</code>. Las señales son
          aproximadamente espejo: si EUR/USD está en tendencia alcista fuerte,
          USD/EUR aparecerá en tendencia bajista fuerte. Útil para analizar la
          misma operación desde la perspectiva contraria.
        </p>
      </div>

      <div className="mx-auto max-w-[1400px]">
        <PriceHero asset={asset} />
      </div>
      <VerdictPanel asset={asset} />
      <SignalsGrid asset={asset} />
      <IndicatorsGrid asset={asset} />
      <PatternsPanel asset={asset} />
      <PriceChart asset={asset} />
      <RSIChart asset={asset} />
      <Footer />
    </main>
  );
}
