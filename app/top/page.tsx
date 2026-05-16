'use client';
import { useMarkets } from '@/hooks/useMarkets';
import { MarketCard, MarketCardSkeleton } from '@/components/terminal/MarketCard';
import { TopBar } from '@/components/terminal/TopBar';
import { Footer } from '@/components/terminal/Footer';

export default function TopPage() {
  const { data, isLoading, isError } = useMarkets(20);

  return (
    <main className="min-h-screen bg-bg text-text">
      <TopBar />
      <section className="border-b border-border-strong px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
            § Top 20 · Market Cap
          </div>
          <h1 className="title-serif mt-2 text-3xl sm:text-4xl">
            Las 20 cripto más <em>relevantes</em>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-dim">
            Top 100 por capitalización de CoinGecko, filtrando stablecoins y
            tokens envueltos 1:1 (USDT, USDC, WBTC, stETH, …). Clic en cualquiera
            para ver su análisis técnico completo: 10 indicadores + sentiment de
            noticias, señales multi-timeframe, charts y niveles operativos.
          </p>
          {isError && (
            <div className="mt-6 rounded-sm border border-down/40 bg-down/5 px-4 py-3 text-sm text-down">
              No se pudo cargar el listado de CoinGecko. Reintentando…
            </div>
          )}
          <div className="mt-8 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading &&
              Array.from({ length: 20 }).map((_, i) => <MarketCardSkeleton key={i} />)}
            {data?.items.map((m, idx) => (
              <MarketCard key={m.id} market={m} rank={idx + 1} />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
