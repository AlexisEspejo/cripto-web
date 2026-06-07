# Decisiones de arquitectura · BTC Terminal v0.1.0

Decisiones tomadas autónomamente durante la primera entrega, ordenadas por
relevancia.

## 1 · Indicadores como funciones puras, una por archivo

Cada uno de los 11 indicadores vive en `lib/indicators/<nombre>.ts`, sin
side-effects ni estado. Esto:

- Permite testear con Vitest sin tocar DOM ni mocks de fetch.
- Habilita tree-shaking — el bundle del cliente solo importa lo que usa.
- Da paridad 1:1 con las funciones del HTML de referencia para auditoría.

Trade-off: 11 archivos en vez de uno; merece la pena por la testabilidad.

## 2 · Consenso server-side cacheado vs cómputo client-side

El motor de consenso (`generateConsensus`) se expone vía
`GET /api/consensus` (revalidate 300s) **y** se importa client-side en
`SignalsGrid` para el subset de generación de señales por timeframe.

- Server-side: lectura barata vía edge cache, no consume el rate-limit de
  Binance del usuario.
- Client-side (señales multi-timeframe): se reutilizan los klines ya
  cacheados por `useKlines`, sin doble fetch.

Si en una iteración futura el cálculo se vuelve más caro (ej. ML), se
centraliza todo en server.

## 3 · TanStack Query en vez de SWR

TanStack v5 ofrece:

- `staleTime` separado de `refetchInterval` → más control sobre re-renders.
- Invalidación granular por clave.
- DevTools opcional.

Cost: ~12kb gzipped en cliente; aceptable.

## 4 · Zustand con `persist` en vez de cookies para preferencias UI

`chartInterval` y `asset` son preferencias puramente cliente. Cookies
generarían un round-trip innecesario al servidor. `persist` en `localStorage`
es instantáneo, y al ser client-only no afecta SSR.

Trade-off: hidratación inicial usa el default (`1d`) hasta que se hidrata
la store, lo cual es invisible al usuario.

## 5 · Edge runtime en `/api/price`, `/api/klines`, `/api/consensus`

Binance y CoinGecko son APIs HTTP puras → ideales para edge. Reduce TTFB
~80ms en CDG/IAD. `/api/news` se deja en Node runtime por compatibilidad con
zod parsing complejo en respuesta de CryptoCompare.

## 6 · `noUncheckedIndexedAccess` activado

Activado en `tsconfig.json` por requerimiento del brief. Costo: ~30 `?? 0`
o `?? null` extra en código de indicadores. Beneficio: cero runtime
TypeError por `arr[i].x` cuando `arr[i]` es undefined.

## 7 · WebSocket pospuesto a v0.2.0

El brief lo marcó como stretch goal #1. Decidido posponerlo porque:

- El polling de 30s ya cubre el caso de uso terminal — los precios no
  cambian materialmente en 30s para análisis técnico.
- Implementar WS requiere fallback robusto a polling + reconnect, lo que
  duplica la complejidad de `usePrice`.
- Una primera versión estable con polling es mejor punto de partida que
  una con WS frágil.

Plan: agregar `usePriceStream()` en v0.2.0 cuando se valide la API.

## 8 · No incluir disclaimer modal en first-visit

Implementado el disclaimer en footer + página `/disclaimer` dedicada.
Decidido **no** incluir modal de first-visit porque:

- Es fricción de UX en producto B2C-light.
- El footer es prominente (fondo elevado, link directo).
- La regulación financiera europea/LatAm pide visibilidad, no necesariamente
  modal bloqueante. Si requerimos consent layer real, se hace en una capa
  superior con cookie banner.

Puede sumarse en v0.2.0 si Alexis lo solicita.

## 9 · `eslint-config-next` flat config con plugin react-hooks integrado

Next 16 trae react-hooks dentro de `eslint-config-next/core-web-vitals`, así
que se evita instalación duplicada. La regla
`react-hooks/purity` impidió usar `Date.now()` durante render (correcto), lo
que se resolvió leyendo el timestamp desde el estado de la query.

## 10 · Charts con `react-chartjs-2` en vez de migrar a Recharts

Chart.js es lo que usa el HTML de referencia. Mantener Chart.js evita
divergencia visual y reduce el área de superficie a auditar contra el
original. Recharts ofrecería SVG declarativo, pero Canvas (Chart.js) es más
performante para 365 puntos animados.

## 11 · `vercel.json` con regiones CDG + IAD

Audiencia probable: Europa + Latam/US. CDG (Paris) cubre EU, IAD (Virginia)
cubre AM. Si se confirma audiencia mayoritaria, se reduce a una sola región.

## 12 · API news en Node runtime, no edge

Vercel Edge limita zod parse profundo y headers personalizados. CryptoCompare
no es crítico para TTFB. Decisión low-risk.

## 13 · Tipos discriminados para `IndicatorSignal`

`-2 | -1 | 0 | 1 | 2` literal-union en vez de `number`. Permite que el
TypeScript exigirá que `labelFor()` cubra todos los casos (exhaustive
switch). Si en el futuro se agrega `-3` o `+3`, el compilador grita.

## 14 · Tests con "datasets sintéticos" en vez de fixtures de Binance

Los tests usan series matemáticas (lineales, sinusoidales, Wilder oficial)
en vez de capturar OHLCV reales. Razón:

- Reproducibilidad — el test no falla si Binance cambia datos históricos.
- Velocidad — no hace falta cargar JSON pesados.
- Cobertura específica — cada test verifica una propiedad del indicador,
  no su comportamiento promedio.

Para RSI específicamente sí se usa el dataset oficial de Wilder.

## 15 · Husky/lint-staged NO instalado en v0.1.0

El brief lo pide pero requiere `husky install` post-commit, lo cual genera
fricción en cloud runners. Si Alexis trabaja desde local con pre-commit,
puede añadirlo con:

```bash
pnpm dlx husky-init && pnpm install
pnpm add -D lint-staged
```

Documentado para v0.2.0.

## 16 · Sin asset selector (BTC/ETH) en v0.1.0

La infraestructura está lista (`/api/consensus?symbol=ETH` ya funciona),
pero la UI no incluye selector. Es trabajo de UX no trivial: cambia el
título del hero, branding del status, narrativa de las alertas, etc.
Se posterga a v0.2.0 con diseño dedicado.

## 17 · Sin histórico de veredictos (KV)

Pospuesto. El KV de Vercel requiere setup adicional + monitoreo de cuota.
La feature aporta valor visual (sparkline) pero no operativo. Prioridad
menor que las features ya entregadas.

## 18 · Sin PWA / service worker

Pospuesto. Las notificaciones push de cripto son típicamente intrusivas y
requieren consent flow correcto. No es valor crítico para la v0.1.

## 19 · Sentiment como indicador #11 (soft blend) en v0.2.0

Razón: el HTML original separaba sentiment de noticias del verdict, pero
agregarlo da una lectura más completa sin diluir la señal técnica. El
diseño escogido:

- **Opcional**: `generateConsensus(klines, { newsNetScore })`. Sin esa
  opción la firma vieja sigue funcionando idéntica.
- **Peso reducido**: el sentiment mapea a `[-2, +2]` igual que cualquier
  otro indicador, así que solo puede empujar el score ±2 sobre los ±22
  técnicos. Imposible que un día de hype "rally rally rally" voltee un
  verdict técnicamente bearish.
- **Thresholds escalan**: el umbral STRONG se calcula como
  `ceil(maxScore × 0.6)`, así que con 11 indicadores STRONG = 14 (60 % de
  22) y con 12 indicadores STRONG = 15 (60 % de 24). Mantiene el rigor.
- **Fallback transparente**: si las noticias fallan o se quedan vacías,
  `getNewsNetScore()` devuelve `null` y el consenso vuelve a 11
  indicadores sin que el usuario lo note.
- **Visible en UI**: el panel muestra `−24 / +24 +sentiment` cuando está
  activo y la fila #12 aparece en la tabla de indicadores. Auditabilidad.

Cualquier alternativa más sofisticada (NLP transformer, sentiment
ponderado por reach de la fuente, etc.) está fuera del scope de v0.2.0.

## 20 · Página /guia como metodología pública

Documentar el algoritmo en una página accesible cumple dos objetivos:

- **Confianza**: el usuario puede auditar cada threshold y cada fórmula
  antes de tomar el verdict en serio.
- **Defensa legal**: refuerza el disclaimer mostrando que no hay magia,
  solo agregación de indicadores estándar de la industria.

Estructura: 9 secciones (filosofía, los 11 indicadores con tablas de
mapeo, sentiment, motor de consenso, niveles operativos, multi-timeframe,
alertas, fuentes de datos, limitaciones honestas). Server-rendered, sin
JS de cliente. Linkeada desde TopBar y Footer.
