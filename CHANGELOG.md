# Changelog

Todos los cambios notables al proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/),
versioning [SemVer](https://semver.org/).

## [Unreleased]

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
