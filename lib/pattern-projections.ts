import type { PatternFeatures } from './projections';

export type ProjectionDirection = 'bullish' | 'bearish' | 'neutral';

export type PatternKey =
  | 'higherHighs'
  | 'higherLows'
  | 'lowerHighs'
  | 'lowerLows'
  | 'bollingerSqueeze'
  | 'rsiDivBullish'
  | 'rsiDivBearish'
  | 'macdActivity';

export interface PatternMeta {
  key: PatternKey;
  name: string;
  description: string;
  implication: string;
  /** Signed bias: + bullish, - bearish, 0 neutral. */
  bias: number;
  detected: boolean;
  tone: 'bullish' | 'bearish' | 'neutral';
}

export interface PatternProjection {
  direction: ProjectionDirection;
  confidence: number;
  target: number;
  stop: number;
  targetPct: number;
  stopPct: number;
  rationale: string[];
  patterns: PatternMeta[];
  netBias: number;
  lastPrice: number;
}

export interface ProjectionInputs {
  lastPrice: number;
  support: number;
  resistance: number;
  patterns: PatternFeatures;
  trend?: 'alcista' | 'bajista' | 'lateral';
}

export function deriveProjection(input: ProjectionInputs): PatternProjection {
  const { lastPrice, support, resistance, patterns, trend } = input;

  const list: PatternMeta[] = [
    {
      key: 'higherHighs',
      name: 'Higher Highs',
      description:
        'Cada nueva subida supera al máximo anterior. Estructura alcista clásica.',
      implication: 'Continuación alcista probable mientras se mantenga la secuencia.',
      bias: patterns.higherHighs ? 1 : 0,
      detected: patterns.higherHighs,
      tone: 'bullish',
    },
    {
      key: 'higherLows',
      name: 'Higher Lows',
      description:
        'Cada retroceso encuentra suelo por encima del anterior. Confirma tendencia.',
      implication: 'Compradores defienden niveles cada vez más altos.',
      bias: patterns.higherLows ? 1 : 0,
      detected: patterns.higherLows,
      tone: 'bullish',
    },
    {
      key: 'lowerHighs',
      name: 'Lower Highs',
      description:
        'Cada rally se topa con un techo más bajo. Estructura bajista clásica.',
      implication: 'Vendedores controlan; continuación bajista probable.',
      bias: patterns.lowerHighs ? -1 : 0,
      detected: patterns.lowerHighs,
      tone: 'bearish',
    },
    {
      key: 'lowerLows',
      name: 'Lower Lows',
      description:
        'Cada nueva caída supera al mínimo previo. Confirma debilidad.',
      implication: 'Ruptura de soportes: target por debajo del último mínimo.',
      bias: patterns.lowerLows ? -1 : 0,
      detected: patterns.lowerLows,
      tone: 'bearish',
    },
    {
      key: 'bollingerSqueeze',
      name: 'Bollinger Squeeze',
      description:
        'Bandas estrechándose: volatilidad comprimida. Suele preceder a una expansión brusca.',
      implication: 'Breakout inminente — dirección decidida por el primer cierre fuera de la banda.',
      bias: 0,
      detected: patterns.bollingerSqueeze,
      tone: 'neutral',
    },
    {
      key: 'rsiDivBullish',
      name: 'Divergencia RSI alcista',
      description:
        'El precio hace mínimos más bajos pero el RSI hace mínimos más altos. Agotamiento bajista.',
      implication: 'Reversión alcista probable hacia la resistencia reciente.',
      bias: patterns.rsiDivergence === 'bullish' ? 2 : 0,
      detected: patterns.rsiDivergence === 'bullish',
      tone: 'bullish',
    },
    {
      key: 'rsiDivBearish',
      name: 'Divergencia RSI bajista',
      description:
        'El precio hace máximos más altos pero el RSI hace máximos más bajos. Agotamiento alcista.',
      implication: 'Reversión bajista probable hacia el soporte reciente.',
      bias: patterns.rsiDivergence === 'bearish' ? -2 : 0,
      detected: patterns.rsiDivergence === 'bearish',
      tone: 'bearish',
    },
    {
      key: 'macdActivity',
      name: 'Cruces MACD frecuentes',
      description:
        'Más de 4 cruces de la línea de señal en la ventana reciente: indecisión.',
      implication: 'Mercado lateral, esperar definición antes de operar.',
      bias: 0,
      detected: patterns.macdCrosses >= 4,
      tone: 'neutral',
    },
  ];

  const netBias = list.filter(p => p.detected).reduce((acc, p) => acc + p.bias, 0);
  const trendBias = trend === 'alcista' ? 0.5 : trend === 'bajista' ? -0.5 : 0;
  const totalBias = netBias + trendBias;

  let direction: ProjectionDirection = 'neutral';
  if (totalBias >= 1.5) direction = 'bullish';
  else if (totalBias <= -1.5) direction = 'bearish';

  const confidence = Math.max(0, Math.min(1, Math.abs(totalBias) / 4));

  const range = Math.max(0, resistance - support);
  let target: number;
  let stop: number;
  if (direction === 'bullish') {
    const extension = patterns.higherHighs && patterns.higherLows ? range * 0.5 : 0;
    target = resistance + extension;
    stop = support;
  } else if (direction === 'bearish') {
    const extension = patterns.lowerLows && patterns.lowerHighs ? range * 0.5 : 0;
    target = support - extension;
    stop = resistance;
  } else {
    const mid = (support + resistance) / 2;
    target = mid;
    stop = lastPrice > mid ? resistance : support;
  }

  const rationale: string[] = [];
  if (patterns.higherHighs) rationale.push('Estructura HH detectada (alcista).');
  if (patterns.higherLows) rationale.push('Estructura HL detectada (alcista).');
  if (patterns.lowerHighs) rationale.push('Estructura LH detectada (bajista).');
  if (patterns.lowerLows) rationale.push('Estructura LL detectada (bajista).');
  if (patterns.rsiDivergence === 'bullish')
    rationale.push('Divergencia RSI alcista vigente.');
  if (patterns.rsiDivergence === 'bearish')
    rationale.push('Divergencia RSI bajista vigente.');
  if (patterns.bollingerSqueeze)
    rationale.push('Bollinger squeeze: breakout inminente, dirección abierta.');
  if (patterns.macdCrosses >= 4)
    rationale.push(`MACD con ${patterns.macdCrosses} cruces recientes: chop / indecisión.`);
  if (rationale.length === 0)
    rationale.push('Sin patrones técnicos significativos en la ventana actual.');

  return {
    direction,
    confidence,
    target,
    stop,
    targetPct: lastPrice > 0 ? (target / lastPrice - 1) * 100 : 0,
    stopPct: lastPrice > 0 ? (stop / lastPrice - 1) * 100 : 0,
    rationale,
    patterns: list,
    netBias: totalBias,
    lastPrice,
  };
}
