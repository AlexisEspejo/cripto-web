# Changelog

Todos los cambios notables al proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/),
versioning [SemVer](https://semver.org/).

## [Unreleased]

### Added (liquidez)

- **Indicador de liquidez · "pull de liquidez"** (`lib/indicators/liquidity.ts`):
  detector de barridos de liquidez (liquidity sweeps) sobre OHLCV. Identifica
  los pools de stops más allá de los swing highs/lows de las últimas 20 velas
  y clasifica cada vela en `bull-sweep` / `bear-sweep` / `bull-breakout` /
  `bear-breakdown` / `range`, ponderado por volumen.
- Integrado como **parámetro #11 del consenso** (`lib/consensus.ts`), aplicado
  automáticamente a **todos los activos** (cripto, top 100, EUR/USD). El score
  técnico base pasa de ±20 a ±22 (±24 con sentiment).
- Documentado en `/guia` y testeado en `tests/indicators/liquidity.test.ts`.

### Added (multi-asset)

- **Asset registry** (`lib/asset-registry.ts`) con specs canónicas y un
  blocklist de stablecoins + wrapped tokens.
- **Yahoo Finance client** (`lib/api-clients/yahoo.ts`) como fallback
  para crypto y fuente única para forex (EUR/USD).
- **Dispatcher unificado** (`lib/asset-fetchers.ts`) que enruta cada
  asset al mejor exchange disponible: Binance → Kraken → Yahoo
  (crypto), Yahoo only (FX).
- **Top 20 cripto** (`/top`) — toma top 100 de CoinGecko, filtra
  stablecoins (USDT/USDC/DAI/…) y wrapped/staked tokens (WBTC, stETH,
  WETH, rETH, …), muestra grid responsive con sparkline, market cap,
  vol 24h y link al análisis completo.
- **EUR/USD** (`/eurusd`) — mismo dashboard de análisis (10
  indicadores + verdict + niveles + charts) sobre datos forex.
- **Asset dinámico** (`/asset/[id]`) — análisis completo para
  cualquier símbolo del top 100 (e.g., `/asset/SOL`, `/asset/AVAX`).
- **Proyecciones** (`/proyecciones`):
  - Selector de activo + horizonte (7d, 30d, 90d, 180d, 365d) + monto.
  - Análisis de tendencia: regresión lineal con R², pendiente diaria,
    soporte/resistencia Donchian, régimen de volatilidad ATR,
    volatilidad y retorno anualizados.
  - Simulación Monte Carlo (GBM, 1 000 caminos) sobre retornos
    logarítmicos históricos, con bandas P5/P25/P50/P75/P95.
  - Tarjetas de escenario: base (P50), alcista (P95), bajista (P5)
    mostrando valor proyectado y % return.
  - Reutiliza VerdictPanel + IndicatorsGrid para el mismo análisis
    técnico del §01.
- API routes generalizadas (`?asset=ID`) en `/api/price`,
  `/api/klines/[interval]`, `/api/consensus`, más `/api/markets`.
- Hooks (`usePrice`, `useKlines`, `useConsensus`, `useMarkets`) y
  componentes (`TopBar`, `PriceHero`, `AlertsBar`, `VerdictPanel`,
  `SignalsGrid`, `IndicatorsGrid`, `PriceChart`, `RSIChart`,
  `NewsFeed`) aceptan ahora una `AssetSpec` opcional.
- Tests Monte Carlo + regresión de tendencia (47 totales).
- Navegación en TopBar: Top 20 · EUR/USD · Proyecciones · Guía.

### Added

- **Sentiment de noticias como indicador #11** en el consenso técnico
  (soft blend). `generateConsensus(klines, { newsNetScore })` ahora
  acepta un net score opcional `[-100, +100]` que se mapea a una señal
  discreta `[-2, +2]` y se agrega a la suma. Si las noticias no están
  disponibles el consenso vuelve al modo 10-indicadores sin penalización.
- `ConsensusResult` expone ahora `maxScore` y `includesSentiment` para
  que el UI muestre la escala correcta.
- Thresholds de verdict ahora escalan con el número de indicadores
  (`STRONG = ceil(maxScore × 0.6)`).
- Página `/guia` con metodología completa: filosofía, fórmulas de cada
  indicador, mapeo de señales, motor de consenso, niveles operativos,
  multi-timeframe, alertas, fuentes de datos y limitaciones honestas.
  Enlazada desde TopBar y Footer.
- `lib/news-aggregate.ts` centraliza la carga + clasificación de
  noticias para que `/api/news` y `/api/consensus` compartan código.
- 5 tests nuevos para sentiment blending (40 totales).

### Changed

- `/api/consensus` ahora corre en runtime Node (antes edge) para tener
  presupuesto de CPU al cargar las 3 RSS en paralelo, y arma el verdict
  con `klines + news` en `Promise.all`. La news se trae con un timeout
  de 4 s y degrada gracefully a `null`.
- `VerdictPanel` ahora muestra `Score · escala −N / +N +sentiment`
  dinámicamente según `maxScore` e `includesSentiment` del payload.

## [0.1.0] – 2026-05-16

### Added

- Migración del MVP HTML (`reference/btc_live_terminal.html`) a Next.js 15
  con App Router, TypeScript estricto (`noUncheckedIndexedAccess`),
  Tailwind 4 y design tokens en CSS variables.
- 10 indicadores técnicos como funciones puras en `lib/indicators/`
  (EMA, SMA, RSI, MACD, Stochastic, Bollinger Bands, Williams %R, CCI,
  ADX/DI, MFI, Ichimoku).
- Motor de consenso (`lib/consensus.ts`) que agrega los 10 indicadores en un
  score `[-20, +20]` y devuelve verdict + niveles operativos (entry, stop,
  TP1/2/3).
- Generación de señales por timeframe (`lib/signals.ts`) para 1H, 4H, 1D, 1W.
- Clasificador de sentiment keyword-based para noticias
  (`lib/news-sentiment.ts`).
- API routes server-side cacheadas:
  - `GET /api/price` (revalidate 30s, edge runtime)
  - `GET /api/klines/[interval]` (revalidate 5min, edge runtime)
  - `GET /api/news` (revalidate 5min)
  - `GET /api/consensus` (revalidate 5min, edge runtime)
- Hooks de TanStack Query (`usePrice`, `useKlines`, `useNews`,
  `useConsensus`) con polling + stale-while-revalidate.
- Zustand store persistido para preferencias UI (`chartInterval`, `asset`).
- 9 componentes terminal: `TopBar`, `PriceHero`, `AlertsBar`,
  `VerdictPanel`, `SignalsGrid`, `IndicatorsGrid`, `PriceChart`,
  `RSIChart`, `NewsFeed`, `Footer`.
- Página `/disclaimer` legal completa + visibilidad en footer.
- Selector de timeframe en charts (1H/4H/1D/1W) persistido.
- Animaciones `flash-up` / `flash-down` 800ms en cambios de precio.
- 33 tests Vitest cubriendo todos los indicadores + consensus.
- `vercel.json` con regiones CDG + IAD.
- Configuración ESLint + Prettier + tsconfig estricto.
- README, DECISIONS.md, este CHANGELOG.

### Decisions

Ver [`DECISIONS.md`](./DECISIONS.md) para el racional de cada decisión
arquitectónica.

### Known limitations

- WebSocket de Binance no implementado (polling 30s es suficiente para v0.1).
- Sin asset selector BTC↔ETH en UI (la API ya soporta `?symbol=ETH`).
- Sin histórico de veredictos en KV.
- Sin PWA / service worker / push notifications.
- Husky pre-commit no instalado (manual en `pnpm` post-clone).
- Lighthouse en producción no medido — pendiente al deployar.
