import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guía · Cómo se calcula el análisis · BTC Terminal',
  description:
    'Metodología completa del terminal: cómo se calculan los 10 indicadores técnicos, el motor de consenso, los niveles operativos y el sentiment de noticias.',
};

export default function GuiaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        href="/"
        className="text-[10px] uppercase tracking-[0.25em] text-brand hover:underline"
      >
        ← Volver al terminal
      </Link>

      <header className="mt-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-text-mute">
          Metodología · v0.1.0
        </div>
        <h1 className="title-serif mt-2 text-4xl leading-tight sm:text-5xl">
          ¿Cómo <em>analizamos</em>?
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-dim">
          Esta guía explica con detalle qué hace cada número del terminal. No es
          asesoría financiera — es la descripción matemática del proceso para
          que puedas auditar, criticar o adaptar el método.
        </p>
      </header>

      <Toc />

      <Section id="filosofia" eyebrow="§ 01" title="Filosofía del sistema">
        <p>
          El terminal hace <strong className="text-text">análisis técnico
          puro</strong>: estructura matemática del precio en distintos
          intervalos. No usa <em>on-chain data</em>, no usa derivados, no
          intenta predecir narrativa. La hipótesis subyacente es la clásica:
          toda la información relevante ya está en el precio.
        </p>
        <p>
          Sobre el precio aplicamos diez indicadores técnicos estándar de la
          industria, traducimos cada uno a una señal discreta de cinco niveles{' '}
          <code className="font-mono">[-2, -1, 0, +1, +2]</code>, y sumamos.
          Una undécima señal opcional viene de las noticias.
        </p>
        <p>
          La salida es un <strong className="text-text">veredicto</strong> en
          cinco escalones (STRONG BUY · BUY · HOLD · SELL · STRONG SELL) más{' '}
          <strong className="text-text">niveles operativos</strong> (entry
          zone, stop loss, take profits).
        </p>
      </Section>

      <Section id="indicadores" eyebrow="§ 02" title="Los 10 indicadores técnicos">
        <p>
          Cada uno vive como <em>función pura</em> en{' '}
          <code className="font-mono">lib/indicators/</code> y se calcula sobre
          365 velas diarias de BTC/USDT. Cuando el indicador entra en una zona
          determinada, mapea a una señal discreta:
        </p>
        <ScoreLegend />

        <IndicatorBlock
          n={1}
          name="RSI (14) · Relative Strength Index"
          formula="100 − 100 / (1 + avgGain / avgLoss) · Wilder smoothing"
          rules={[
            { range: '> 75', s: -2, note: 'Sobrecompra extrema · pullback probable' },
            { range: '70 – 75', s: -1, note: 'Sobrecompra · vigilar reversión' },
            { range: '25 – 70', s: 0, note: 'Zona normal de momentum' },
            { range: '25 – 30', s: 1, note: 'Sobreventa · zona de compra' },
            { range: '< 25', s: 2, note: 'Sobreventa extrema · rebote probable' },
          ]}
        />

        <IndicatorBlock
          n={2}
          name="MACD (12, 26, 9)"
          formula="EMA(12) − EMA(26) vs línea de señal EMA(9); histograma = MACD − signal"
          rules={[
            { range: 'MACD > signal, hist > 0 y creciente', s: 2, note: 'Histograma alcista creciendo' },
            { range: 'MACD > signal, hist > 0', s: 1, note: 'Sobre línea de señal' },
            { range: 'MACD ≈ signal', s: 0, note: 'Convergencia · sin señal' },
            { range: 'MACD < signal', s: -1, note: 'Bajo línea de señal' },
            { range: 'MACD < signal, hist < 0 y decreciente', s: -2, note: 'Histograma bajista profundizando' },
          ]}
        />

        <IndicatorBlock
          n={3}
          name="Stochastic (14, 3)"
          formula="%K = (close − low14) / (high14 − low14) × 100; %D = SMA(%K, 3)"
          rules={[
            { range: '%K < 20 y cruza %D al alza', s: 2, note: 'Cruce alcista en sobreventa' },
            { range: '%K < 20', s: 1, note: 'Sobreventa' },
            { range: '20 – 80', s: 0, note: 'Zona normal' },
            { range: '%K > 80', s: -1, note: 'Sobrecompra' },
            { range: '%K > 80 y cruza %D a la baja', s: -2, note: 'Cruce bajista en sobrecompra' },
          ]}
        />

        <IndicatorBlock
          n={4}
          name="Bollinger Bands (20, 2σ)"
          formula="banda media = SMA(close, 20); upper/lower = media ± 2 × stdDev(close, 20)"
          rules={[
            { range: 'Precio bajo banda inferior', s: 1, note: 'Bajo banda inferior · rebote' },
            { range: 'Precio < 15 % del rango', s: 1, note: 'Tocando suelo del rango' },
            { range: '15 – 85 % del rango', s: 0, note: 'Dentro del canal' },
            { range: 'Precio > 85 % del rango', s: -1, note: 'Tocando techo del rango' },
            { range: 'Precio sobre banda superior', s: -1, note: 'Sobre banda superior · reversión' },
          ]}
        />

        <IndicatorBlock
          n={5}
          name="EMA 50 / EMA 200"
          formula="cruces y posición relativa del precio. Detecta Golden / Death Cross."
          rules={[
            { range: 'Cruce EMA50 sobre EMA200 (Golden)', s: 2, note: 'GOLDEN CROSS reciente' },
            { range: 'Precio > EMA50 > EMA200', s: 2, note: 'Estructura alcista plena' },
            { range: 'Precio > EMA50', s: 1, note: 'Sobre EMA50' },
            { range: 'Entre EMAs', s: 0, note: 'Sin estructura clara' },
            { range: 'Precio < EMA200', s: -1, note: 'Bajo EMA200' },
            { range: 'Precio < EMA50 < EMA200', s: -2, note: 'Estructura bajista plena' },
            { range: 'Cruce EMA50 bajo EMA200 (Death)', s: -2, note: 'DEATH CROSS reciente' },
          ]}
        />

        <IndicatorBlock
          n={6}
          name="Williams %R (14)"
          formula="(high14 − close) / (high14 − low14) × −100 · oscila en [−100, 0]"
          rules={[
            { range: '< −90', s: 2, note: 'Sobreventa extrema' },
            { range: '−90 a −80', s: 1, note: 'Sobreventa' },
            { range: '−80 a −20', s: 0, note: 'Zona media' },
            { range: '−20 a −10', s: -1, note: 'Sobrecompra' },
            { range: '> −10', s: -2, note: 'Sobrecompra extrema' },
          ]}
        />

        <IndicatorBlock
          n={7}
          name="CCI (20) · Commodity Channel Index"
          formula="(typicalPrice − SMA(tp, 20)) / (0.015 × meanAbsDev) · típicamente en [−200, +200]"
          rules={[
            { range: '< −200', s: 2, note: 'Extremo bajista · rebote' },
            { range: '−200 a −100', s: 1, note: 'Sobreventa' },
            { range: '−100 a +100', s: 0, note: 'Rango normal' },
            { range: '+100 a +200', s: -1, note: 'Sobrecompra' },
            { range: '> +200', s: -2, note: 'Extremo alcista · reversión' },
          ]}
        />

        <IndicatorBlock
          n={8}
          name="ADX + DI (14) · Average Directional Index"
          formula="Wilder smoothing sobre +DM / −DM / TR; ADX mide fuerza, +DI/−DI dirección"
          rules={[
            { range: 'ADX > 40 y +DI > −DI', s: 2, note: 'Tendencia alcista fuerte' },
            { range: 'ADX > 25 y +DI > −DI', s: 1, note: 'Tendencia alcista' },
            { range: 'ADX < 25', s: 0, note: 'Sin tendencia clara · mercado en rango' },
            { range: 'ADX > 25 y −DI > +DI', s: -1, note: 'Tendencia bajista' },
            { range: 'ADX > 40 y −DI > +DI', s: -2, note: 'Tendencia bajista fuerte' },
          ]}
        />

        <IndicatorBlock
          n={9}
          name="MFI (14) · Money Flow Index"
          formula="RSI ponderado por volumen sobre typicalPrice × volume"
          rules={[
            { range: '< 20', s: 1, note: 'Sobreventa de volumen' },
            { range: '20 – 40', s: 0, note: 'Flujo negativo · neutral' },
            { range: '40 – 60', s: 0, note: 'Flujo equilibrado' },
            { range: '60 – 80', s: 0, note: 'Flujo positivo · neutral' },
            { range: '> 80', s: -1, note: 'Sobrecompra de volumen' },
          ]}
        />

        <IndicatorBlock
          n={10}
          name="Ichimoku (9, 26) · Tenkan / Kijun"
          formula="Tenkan = midpoint(highs/lows, 9); Kijun = midpoint(highs/lows, 26)"
          rules={[
            { range: 'Cruce Tenkan sobre Kijun', s: 2, note: 'Cruce alcista Tenkan/Kijun' },
            { range: 'Tenkan > Kijun y precio arriba', s: 1, note: 'Estructura alcista' },
            { range: 'Sin alineación clara', s: 0, note: '—' },
            { range: 'Tenkan < Kijun y precio abajo', s: -1, note: 'Estructura bajista' },
            { range: 'Cruce Tenkan bajo Kijun', s: -2, note: 'Cruce bajista Tenkan/Kijun' },
          ]}
        />
      </Section>

      <Section
        id="sentiment"
        eyebrow="§ 03"
        title="Sentiment de noticias · indicador #11 (opcional)"
      >
        <p>
          Para enriquecer la lectura técnica, agregamos un{' '}
          <strong className="text-text">undécimo indicador</strong> derivado del
          feed de noticias. Cada artículo se clasifica como{' '}
          <span className="text-up">bull</span>,{' '}
          <span className="text-down">bear</span> o{' '}
          <span className="text-warn">neutral</span> con un{' '}
          <em>clasificador keyword-based</em> simple: cuenta palabras-clave
          alcistas (rally, surge, breakout, ATH, inflow…) y bajistas (crash,
          plunge, outflow, hack…) en título + cuerpo.
        </p>
        <p>
          El <strong className="text-text">netScore</strong> agregado es{' '}
          <code className="font-mono">((bull − bear) / total) × 100</code> en{' '}
          <code className="font-mono">[−100, +100]</code> y mapea así:
        </p>
        <table className="my-4 w-full text-xs">
          <thead>
            <tr className="border-b border-border-strong text-text-mute uppercase tracking-wider text-[10px]">
              <th className="py-2 text-left">Net score</th>
              <th className="py-2 text-left">Señal</th>
              <th className="py-2 text-left">Lectura</th>
            </tr>
          </thead>
          <tbody className="text-text-dim">
            <Row range="≥ +40" s={2} note="Sentiment muy bullish · flujo narrativo positivo" />
            <Row range="+15 a +39" s={1} note="Sentiment bullish · titulares favorables" />
            <Row range="−14 a +14" s={0} note="Sentiment neutro" />
            <Row range="−15 a −39" s={-1} note="Sentiment bearish · titulares adversos" />
            <Row range="≤ −40" s={-2} note="Sentiment muy bearish · narrativa negativa" />
          </tbody>
        </table>
        <p className="text-[11px] italic text-text-mute">
          Importante: el clasificador es <strong>una heurística</strong>. No
          entiende ironía, contexto editorial ni rumor markets. Por eso lo
          tratamos como un peso <em>blend</em> que solo puede empujar el
          veredicto ±2 puntos sobre un score técnico que ya va de −20 a +20.
          Cuando el sentiment falla o no hay noticias, el consenso vuelve
          al modo 10-indicadores sin penalización.
        </p>
      </Section>

      <Section id="motor" eyebrow="§ 04" title="El motor de consenso">
        <p>
          Sumamos las señales discretas de los 10 (u 11) indicadores. El{' '}
          <strong className="text-text">score total</strong> resultante va de{' '}
          <code className="font-mono">−20</code> a <code className="font-mono">+20</code>{' '}
          (o <code className="font-mono">±22</code> con sentiment). El umbral{' '}
          <strong>STRONG</strong> escala con el número de indicadores activos
          (60 % del máximo posible):
        </p>
        <div className="my-4 overflow-hidden rounded-sm border border-border-strong">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg-card text-text-mute uppercase tracking-wider text-[10px]">
                <th className="px-3 py-2 text-left">Score · 10 indicadores</th>
                <th className="px-3 py-2 text-left">Score · 11 indicadores</th>
                <th className="px-3 py-2 text-left">Verdict</th>
              </tr>
            </thead>
            <tbody className="bg-bg-elev text-text-dim">
              <tr className="border-t border-border">
                <td className="px-3 py-2 tabular-nums">≥ +12</td>
                <td className="px-3 py-2 tabular-nums">≥ +14</td>
                <td className="px-3 py-2 text-up font-semibold">STRONG BUY</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 tabular-nums">+5 a +11</td>
                <td className="px-3 py-2 tabular-nums">+5 a +13</td>
                <td className="px-3 py-2 text-up font-semibold">BUY</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 tabular-nums">−4 a +4</td>
                <td className="px-3 py-2 tabular-nums">−4 a +4</td>
                <td className="px-3 py-2 text-warn font-semibold">HOLD</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 tabular-nums">−11 a −5</td>
                <td className="px-3 py-2 tabular-nums">−13 a −5</td>
                <td className="px-3 py-2 text-down font-semibold">SELL</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 tabular-nums">≤ −12</td>
                <td className="px-3 py-2 tabular-nums">≤ −14</td>
                <td className="px-3 py-2 text-down font-semibold">STRONG SELL</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Esta lógica está testeada en{' '}
          <code className="font-mono">tests/indicators/consensus.test.ts</code>{' '}
          con datasets sintéticos alcistas, bajistas y rangos.
        </p>
      </Section>

      <Section id="niveles" eyebrow="§ 05" title="Niveles operativos">
        <p>
          Cuando hay convicción direccional, el motor produce niveles concretos.
          Todos relativos al último precio cerrado del candle diario:
        </p>
        <ul className="my-4 space-y-2 text-sm text-text-dim">
          <li>
            <strong className="text-text">Entry zone:</strong>{' '}
            <code className="font-mono">precio × 0.995 → precio × 1.005</code>{' '}
            (±0.5 % alrededor del precio actual).
          </li>
          <li>
            <strong className="text-text">Stop loss:</strong> en BUY,{' '}
            <code className="font-mono">min(bb.lower, ema50, precio × 0.94)</code>{' '}
            — el suelo técnico más cercano. En SELL es el espejo (ceiling).
          </li>
          <li>
            <strong className="text-text">TP1 / TP2 / TP3:</strong>{' '}
            <code className="font-mono">+5 % / +10 % / +18 %</code> en BUY,{' '}
            <code className="font-mono">−5 / −10 / −18 %</code> en SELL,{' '}
            <code className="font-mono">±3 / ±6 / ±10 %</code> en HOLD (rango
            esperado de oscilación).
          </li>
        </ul>
        <p className="text-[11px] italic text-text-mute">
          Estos niveles son <em>sugerencias derivadas matemáticamente</em> de
          la estructura técnica, no recomendaciones de inversión ni
          dimensionamiento de riesgo. El usuario decide tamaño de posición y
          relación riesgo-beneficio.
        </p>
      </Section>

      <Section id="multitf" eyebrow="§ 06" title="Señales multi-timeframe">
        <p>
          El verdict del §01 usa la vela diaria. Las cuatro tarjetas del §02
          (1H · 4H · 1D · 1W) usan una <em>versión ligera</em> del consenso
          centrada en momentum y estructura, con un score acotado en{' '}
          <code className="font-mono">[−100, +100]</code>:
        </p>
        <ul className="my-4 space-y-1 text-sm text-text-dim">
          <li>· RSI(14) — peso variable según zona (extremo, alcista, bajista).</li>
          <li>· Posición de precio vs EMA20, EMA50 y EMA200.</li>
          <li>· Cruce EMA50 ↔ EMA200 (golden / death cross).</li>
          <li>
            · Momentum reciente (cambio % en últimas N velas, N adaptable al
            timeframe).
          </li>
          <li>· MACD: posición vs signal + dirección del histograma.</li>
        </ul>
        <p>
          Cada timeframe se evalúa <strong className="text-text">en paralelo
          e independiente</strong>: una señal alcista en 1H con bajista en 1W
          significa que el corto plazo sube dentro de una tendencia mayor que
          baja. La idea es que veas el conflicto, no que se promedie.
        </p>
      </Section>

      <Section id="alertas" eyebrow="§ 07" title="Alertas técnicas (top bar)">
        <p>
          La barra superior dispara alertas cuando se cumple alguna condición
          de cruce o extremo:
        </p>
        <ul className="my-4 space-y-1 text-sm text-text-dim">
          <li>· RSI cruzando 70 al alza (riesgo de venta) o 30 a la baja (oportunidad de compra).</li>
          <li>· Precio reclamando o perdiendo EMA200 (gate alcista clave).</li>
          <li>
            · Cualquier timeframe con <code className="font-mono">|score| &gt; 50</code>{' '}
            (señal direccional fuerte).
          </li>
        </ul>
        <p>
          Si no hay ninguna alerta activa, mostramos{' '}
          <em>&ldquo;sin señales extremas — mercado en zona neutral&rdquo;</em>.
        </p>
      </Section>

      <Section id="datos" eyebrow="§ 08" title="Fuentes de datos">
        <ul className="my-4 space-y-2 text-sm text-text-dim">
          <li>
            <strong className="text-text">OHLCV (precio + volumen):</strong>{' '}
            Binance v3 como fuente primaria, Kraken como fallback automático
            cuando Binance no responde (rate limit, geo-block).
          </li>
          <li>
            <strong className="text-text">ATH y market cap:</strong>{' '}
            CoinGecko (cache 1 h).
          </li>
          <li>
            <strong className="text-text">Noticias:</strong> CryptoCompare si
            la API key está configurada; si no, agregador RSS gratuito
            (CoinTelegraph + Decrypt + Bitcoin Magazine) con filtrado por
            keywords BTC.
          </li>
        </ul>
        <p>
          Todos los endpoints están cacheados server-side (price 30 s, klines
          5 min, news 5 min, consensus 5 min) para evitar saturar APIs públicas
          y dar tiempos de respuesta consistentes.
        </p>
      </Section>

      <Section id="limites" eyebrow="§ 09" title="Limitaciones honestas">
        <ul className="my-4 space-y-2 text-sm text-text-dim">
          <li>
            <strong className="text-text">No es predicción.</strong> Los
            indicadores describen lo que <em>ya</em> pasó en el precio.
            Cualquier proyección hacia adelante es interpretación.
          </li>
          <li>
            <strong className="text-text">Los oscilatorios fallan en
            tendencias fuertes.</strong> RSI puede quedarse en sobrecompra/
            sobreventa durante semanas mientras el precio sigue su curso.
          </li>
          <li>
            <strong className="text-text">El sentiment es ruidoso.</strong> El
            clasificador no entiende ironía ni contexto editorial — un titular
            &ldquo;Bitcoin crash predicted&rdquo; cuenta como bear aunque sea click-bait.
          </li>
          <li>
            <strong className="text-text">Sin on-chain.</strong> No miramos
            flujos de exchanges, dirección de mineros, distribución de UTXOs
            ni ningún dato del blockchain mismo.
          </li>
          <li>
            <strong className="text-text">Sin macro.</strong> Tasas, DXY,
            equities, rendimientos del Tesoro — nada de eso entra al modelo.
          </li>
        </ul>
      </Section>

      <footer className="mt-12 border-t border-border-strong pt-6 text-[11px] italic text-text-mute">
        Para el texto legal completo ver{' '}
        <Link href="/disclaimer" className="underline hover:text-text">
          /disclaimer
        </Link>
        . El código fuente del motor está en{' '}
        <code className="font-mono">lib/consensus.ts</code> y los indicadores
        individuales en <code className="font-mono">lib/indicators/</code>.
      </footer>
    </main>
  );
}

function Toc() {
  const items = [
    ['#filosofia', 'Filosofía'],
    ['#indicadores', 'Los 10 indicadores'],
    ['#sentiment', 'Sentiment de noticias'],
    ['#motor', 'Motor de consenso'],
    ['#niveles', 'Niveles operativos'],
    ['#multitf', 'Multi-timeframe'],
    ['#alertas', 'Alertas técnicas'],
    ['#datos', 'Fuentes de datos'],
    ['#limites', 'Limitaciones'],
  ] as const;
  return (
    <nav
      className="mt-10 rounded-sm border border-border-strong bg-bg-card p-4 text-xs"
      aria-label="Tabla de contenidos"
    >
      <div className="text-[10px] uppercase tracking-widest text-brand">Contenido</div>
      <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {items.map(([href, label], i) => (
          <li key={href}>
            <a
              href={href}
              className="text-text-dim hover:text-brand transition-colors"
            >
              <span className="text-text-mute mr-1.5">{String(i + 1).padStart(2, '0')}</span>
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <div className="text-[10px] uppercase tracking-[0.25em] text-brand">{eyebrow}</div>
      <h2 className="title-serif mt-1 text-2xl sm:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-text-dim">
        {children}
      </div>
    </section>
  );
}

function ScoreLegend() {
  const items: Array<{ s: -2 | -1 | 0 | 1 | 2; label: string; meaning: string }> = [
    { s: 2, label: '+2', meaning: 'STRONG BUY · extremo alcista accionable' },
    { s: 1, label: '+1', meaning: 'BUY · sesgo alcista moderado' },
    { s: 0, label: ' 0', meaning: 'NEUTRAL · sin lectura clara' },
    { s: -1, label: '−1', meaning: 'SELL · sesgo bajista moderado' },
    { s: -2, label: '−2', meaning: 'STRONG SELL · extremo bajista accionable' },
  ];
  return (
    <ul className="my-4 grid gap-1.5 rounded-sm border border-border-strong bg-bg-card p-4 text-xs">
      {items.map(it => (
        <li key={it.label} className="flex items-baseline gap-3">
          <span
            className={
              it.s > 0
                ? 'tabular-nums text-up font-semibold w-6'
                : it.s < 0
                ? 'tabular-nums text-down font-semibold w-6'
                : 'tabular-nums text-warn font-semibold w-6'
            }
          >
            {it.label}
          </span>
          <span className="text-text-dim">{it.meaning}</span>
        </li>
      ))}
    </ul>
  );
}

function IndicatorBlock({
  n,
  name,
  formula,
  rules,
}: {
  n: number;
  name: string;
  formula: string;
  rules: Array<{ range: string; s: -2 | -1 | 0 | 1 | 2; note: string }>;
}) {
  return (
    <article className="my-6 rounded-sm border border-border-strong bg-bg-card p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="title-serif text-lg">
          <span className="text-brand mr-2">#{n}</span> {name}
        </h3>
      </header>
      <p className="mt-2 text-[12px] italic text-text-mute font-mono leading-relaxed">
        {formula}
      </p>
      <table className="mt-3 w-full text-xs">
        <tbody>
          {rules.map((r, i) => (
            <Row key={i} range={r.range} s={r.s} note={r.note} />
          ))}
        </tbody>
      </table>
    </article>
  );
}

function Row({
  range,
  s,
  note,
}: {
  range: string;
  s: -2 | -1 | 0 | 1 | 2;
  note: string;
}) {
  const color =
    s > 0
      ? 'text-up'
      : s < 0
      ? 'text-down'
      : 'text-warn';
  const pill = `${s > 0 ? '+' : ''}${s}`;
  return (
    <tr className="border-t border-border first:border-t-0">
      <td className="py-2 pr-3 text-text-dim w-1/2">{range}</td>
      <td className="py-2 pr-3">
        <span className={`tabular-nums font-semibold ${color}`}>{pill}</span>
      </td>
      <td className="py-2 text-text-mute italic">{note}</td>
    </tr>
  );
}
