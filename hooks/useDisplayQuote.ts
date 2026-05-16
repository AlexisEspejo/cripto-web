'use client';
import { useUIStore, type DisplayQuote } from '@/stores/ui-store';
import { useFxRate } from '@/hooks/useFxRate';
import type { AssetSpec } from '@/lib/asset-registry';

export interface FormatOpts {
  /** Native quote of the value. Defaults to USD. */
  from?: DisplayQuote;
  /** Force a specific number of decimals. Auto if omitted. */
  decimals?: number;
  /**
   * If true, the value is a price ratio (FX pair) and conversion is skipped.
   * Forex prices like 1.16 EUR/USD make no sense to "convert".
   */
  ratio?: boolean;
  /** Use compact T/B/M formatting (e.g. for volume, market cap). */
  compact?: boolean;
}

export interface DisplayQuoteApi {
  quote: DisplayQuote;
  setQuote: (q: DisplayQuote) => void;
  /** Current EUR/USD spot, "USD per 1 EUR". 0 if not loaded yet. */
  fxRate: number;
  fxLoaded: boolean;
  /** Convert a value from `from` quote to the display quote. */
  convert: (value: number, from?: DisplayQuote) => number;
  /** Format with the right symbol + conversion. */
  format: (value: number, opts?: FormatOpts) => string;
  /** Symbol for the current display quote ($ or €). */
  symbol: string;
  /** Convenience: format using the rules appropriate for the given asset. */
  formatForAsset: (value: number, asset: AssetSpec, opts?: FormatOpts) => string;
}

export function useDisplayQuote(): DisplayQuoteApi {
  const quote = useUIStore(s => s.displayQuote);
  const setQuote = useUIStore(s => s.setDisplayQuote);
  const fx = useFxRate();
  const fxRate = fx.data?.price ?? 0; // USD per 1 EUR
  const fxLoaded = fxRate > 0;
  const symbol = quote === 'EUR' ? '€' : '$';

  const convert = (value: number, from: DisplayQuote = 'USD'): number => {
    if (!fxLoaded || from === quote) return value;
    if (from === 'USD' && quote === 'EUR') return value / fxRate;
    if (from === 'EUR' && quote === 'USD') return value * fxRate;
    return value;
  };

  const formatCompact = (v: number, sym: string): string => {
    const abs = Math.abs(v);
    if (abs >= 1e12) return sym + (v / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9) return sym + (v / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sym + (v / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sym + (v / 1e3).toFixed(2) + 'K';
    return sym + Math.round(v).toLocaleString('en-US');
  };

  const format = (value: number, opts: FormatOpts = {}): string => {
    if (opts.ratio) {
      const decimals = opts.decimals ?? 4;
      return value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    const converted = convert(value, opts.from ?? 'USD');
    if (opts.compact) return formatCompact(converted, symbol);
    const decimals =
      opts.decimals ?? (Math.abs(converted) >= 100 ? 0 : Math.abs(converted) >= 1 ? 2 : 4);
    return (
      symbol +
      converted.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    );
  };

  const formatForAsset = (value: number, asset: AssetSpec, opts: FormatOpts = {}): string => {
    if (asset.type === 'fx') {
      // FX pairs are ratios — show native value with its native decimals.
      return format(value, { ratio: true, decimals: opts.decimals ?? asset.decimals });
    }
    return format(value, {
      from: asset.quote,
      decimals: opts.decimals ?? asset.decimals,
      compact: opts.compact,
    });
  };

  return { quote, setQuote, fxRate, fxLoaded, convert, format, symbol, formatForAsset };
}
