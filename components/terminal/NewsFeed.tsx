'use client';
import { useNews } from '@/hooks/useNews';
import { fmtRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { ASSETS, type AssetSpec } from '@/lib/asset-registry';

export function NewsFeed({ asset = ASSETS.BTC! }: { asset?: AssetSpec }) {
  const { data, isError } = useNews(asset.hasNews);
  if (!asset.hasNews) return null;

  return (
    <section className="border-b border-border-strong px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="text-[10px] uppercase tracking-[0.25em] text-brand">
          § 05 · Feed de Mercado
        </div>
        <h2 className="title-serif mt-1 text-2xl">
          Noticias con <em>sentiment</em>
        </h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {!data && !isError && [0, 1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-sm" />)}
            {isError && (
              <div className="rounded-sm border border-border-strong bg-bg-card px-4 py-6 text-sm text-text-dim">
                No se pudo cargar el feed de CryptoCompare.
              </div>
            )}
            {data?.items.slice(0, 25).map(n => {
              const pill =
                n.sentiment === 'bull' ? '↑ BULLISH' : n.sentiment === 'bear' ? '↓ BEARISH' : '◆ NEUTRAL';
              const borderColor =
                n.sentiment === 'bull'
                  ? 'border-l-up'
                  : n.sentiment === 'bear'
                  ? 'border-l-down'
                  : 'border-l-warn';
              const pillColor =
                n.sentiment === 'bull'
                  ? 'text-up'
                  : n.sentiment === 'bear'
                  ? 'text-down'
                  : 'text-warn';
              return (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'block rounded-sm border border-border-strong border-l-2 bg-bg-card p-4 transition-colors hover:border-brand',
                    borderColor,
                  )}
                >
                  <div className="flex items-center justify-between text-[11px] text-text-mute">
                    <span>
                      {n.source} · {fmtRelative(n.publishedOn)}
                    </span>
                    <span className={cn('text-[10px] uppercase tracking-wider', pillColor)}>{pill}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-text leading-snug">{n.title}</h3>
                  <p className="mt-1.5 text-[12px] text-text-dim line-clamp-2">
                    {n.body.slice(0, 140)}…
                  </p>
                </a>
              );
            })}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-sm border border-border-strong bg-bg-card p-5">
              <div className="text-[10px] uppercase tracking-widest text-text-mute">
                Sentiment agregado
              </div>
              {data && (
                <>
                  <div
                    className={cn(
                      'mt-2 text-4xl font-semibold tabular-nums',
                      data.aggregate.netScore > 10 && 'text-up',
                      data.aggregate.netScore < -10 && 'text-down',
                      Math.abs(data.aggregate.netScore) <= 10 && 'text-warn',
                    )}
                  >
                    {data.aggregate.netScore > 0 ? '+' : ''}
                    {data.aggregate.netScore}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-text-dim">
                    {data.aggregate.netScore > 20
                      ? 'NETO BULLISH'
                      : data.aggregate.netScore > 5
                      ? 'LIGERAMENTE BULLISH'
                      : data.aggregate.netScore < -20
                      ? 'NETO BEARISH'
                      : data.aggregate.netScore < -5
                      ? 'LIGERAMENTE BEARISH'
                      : 'NEUTRAL'}
                  </div>
                  <div className="mt-4 relative h-2 w-full overflow-hidden bg-bg-elev">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
                    <div
                      className={cn(
                        'absolute inset-y-0',
                        data.aggregate.netScore > 0 ? 'bg-up' : data.aggregate.netScore < 0 ? 'bg-down' : 'bg-warn',
                      )}
                      style={{
                        left: data.aggregate.netScore >= 0 ? '50%' : `${50 - Math.abs(data.aggregate.netScore) / 2}%`,
                        width: `${Math.abs(data.aggregate.netScore) / 2}%`,
                      }}
                    />
                  </div>
                  <dl className="mt-4 space-y-1.5 text-xs">
                    <Row label="↑ Bullish" value={data.aggregate.bull} color="text-up" />
                    <Row label="◆ Neutral" value={data.aggregate.neutral} color="text-warn" />
                    <Row label="↓ Bearish" value={data.aggregate.bear} color="text-down" />
                  </dl>
                </>
              )}
            </div>
            <p className="text-[11px] italic text-text-mute leading-relaxed">
              El sentiment se calcula con un clasificador keyword-based simple sobre título +
              cuerpo de cada artículo. Es una heurística — no sustituye lectura editorial.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-1.5">
      <span className="text-text-dim">{label}</span>
      <span className={cn('tabular-nums font-semibold', color)}>{value}</span>
    </div>
  );
}
