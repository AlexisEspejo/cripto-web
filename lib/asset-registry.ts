export type AssetType = 'crypto' | 'fx';

export interface AssetSpec {
  id: string; // canonical id, e.g., 'BTC', 'ETH', 'EURUSD'
  name: string;
  symbol: string;
  type: AssetType;
  /** Binance trading pair, e.g., 'BTCUSDT'. */
  binancePair?: string;
  /** Kraken OHLC pair, e.g., 'XBTUSD'. */
  krakenPair?: string;
  /** Yahoo Finance symbol, e.g., 'BTC-USD' or 'EURUSD=X'. */
  yahooSymbol?: string;
  /** CoinGecko coin id, e.g., 'bitcoin'. */
  coingeckoId?: string;
  /** Whether the news+sentiment indicator should be blended for this asset. */
  hasNews: boolean;
  /** Decimals for display (0 for BTC-style, 4 for EURUSD). */
  decimals: number;
  /** Currency prefix for display. */
  quote: 'USD' | 'EUR';
}

// Canonical roster for the explicit pages (BTC home, EURUSD page). Other
// crypto assets resolve dynamically via the markets endpoint.
export const ASSETS: Record<string, AssetSpec> = {
  BTC: {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    type: 'crypto',
    binancePair: 'BTCUSDT',
    krakenPair: 'XBTUSD',
    yahooSymbol: 'BTC-USD',
    coingeckoId: 'bitcoin',
    hasNews: true,
    decimals: 0,
    quote: 'USD',
  },
  ETH: {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'crypto',
    binancePair: 'ETHUSDT',
    krakenPair: 'ETHUSD',
    yahooSymbol: 'ETH-USD',
    coingeckoId: 'ethereum',
    hasNews: true,
    decimals: 2,
    quote: 'USD',
  },
  EURUSD: {
    id: 'EURUSD',
    name: 'Euro / US Dollar',
    symbol: 'EUR/USD',
    type: 'fx',
    yahooSymbol: 'EURUSD=X',
    hasNews: false,
    decimals: 4,
    quote: 'USD',
  },
};

/**
 * Stablecoins and 1:1 wrapped/staked assets excluded from the "Top 20"
 * because the user only wants assets that aren't pegged USD/EUR equivalents.
 */
export const PEGGED_BLOCKLIST: ReadonlySet<string> = new Set([
  // USD stablecoins
  'tether',
  'usd-coin',
  'dai',
  'binance-usd',
  'first-digital-usd',
  'true-usd',
  'frax',
  'paxos-standard',
  'usdd',
  'gemini-dollar',
  'liquity-usd',
  'ethena-usde',
  'pyusd',
  'paypal-usd',
  'usual-usd',
  'crypto-com-pos-stable',
  'mountain-protocol-usdm',
  'sky-dollar',
  'usdy',
  'rai',
  'tether-gold',
  'pax-gold',
  'usdb',
  'reserve-rights-token',
  'magic-internet-money',
  'usds',
  'ondo-us-dollar-yield',
  'ripple-usd',
  'falcon-finance',
  'usdc-coin',
  'first-digital-usd-stablecoin',
  // EUR stablecoins
  'stasis-eurs',
  'tether-eurt',
  'monerium-eur-money',
  'eurc',
  // Wrapped / liquid-staking versions that track another asset 1:1
  'wrapped-bitcoin',
  'wrapped-steth',
  'staked-ether',
  'lido-staked-ether',
  'rocket-pool-eth',
  'jito-staked-sol',
  'mantle-staked-ether',
  'weth',
  'binance-staked-eth',
  'kelp-dao-restaked-eth',
  'binance-peg-weth',
  'binance-peg-bitcoin',
  'tbtc',
  'msol',
  'coinbase-wrapped-staked-eth',
  'rocket-pool-eth-2',
  'wrapped-eeth',
  'renzo-restaked-eth',
  'puffer-restaked-eth',
  'stader-ethx',
  'cbeth',
  'sweth',
  'ankr-staked-eth',
  'frax-ether',
  'staked-frax-ether',
  'lombard-staked-btc',
  'solv-protocol-solvbtc',
]);

/** Common symbol → kraken pair overrides (Kraken uses its own naming). */
const KRAKEN_OVERRIDES: Record<string, string> = {
  BTC: 'XBTUSD',
  XBT: 'XBTUSD',
  DOGE: 'XDGUSD',
};

/**
 * Build an `AssetSpec` for an arbitrary crypto symbol. Used by `/top` cards
 * and the dynamic `/asset/[id]` page when the asset isn't in `ASSETS`.
 */
export function buildCryptoSpec(
  id: string,
  name: string,
  coingeckoId?: string,
  decimals?: number,
): AssetSpec {
  const upper = id.toUpperCase();
  return {
    id: upper,
    name,
    symbol: upper,
    type: 'crypto',
    binancePair: `${upper}USDT`,
    krakenPair: KRAKEN_OVERRIDES[upper] ?? `${upper}USD`,
    yahooSymbol: `${upper}-USD`,
    coingeckoId,
    hasNews: true,
    decimals: decimals ?? (upper === 'BTC' ? 0 : 2),
    quote: 'USD',
  };
}

export function resolveAsset(id: string): AssetSpec | null {
  const upper = id.toUpperCase();
  return ASSETS[upper] ?? null;
}
