import { ema, rsi, macd } from './indicators';
import type { Kline, SignalLabel, TimeframeSignal } from './types';

export function generateSignal(klines: Kline[], label: SignalLabel): TimeframeSignal {
  if (!klines || klines.length < 50) {
    return {
      label,
      score: 0,
      direction: 'neutral',
      drivers: ['Datos insuficientes'],
    };
  }
  const closes = klines.map(k => k.close);
  const lp = closes[closes.length - 1] ?? 0;
  const drivers: string[] = [];
  let score = 0;

  // RSI 14
  const rsiArr = rsi(closes, 14);
  const lastRSI = rsiArr[rsiArr.length - 1];
  if (lastRSI != null) {
    if (lastRSI > 75) {
      score -= 22;
      drivers.push(`RSI ${lastRSI.toFixed(1)} · sobrecompra extrema`);
    } else if (lastRSI > 65) {
      score += 8;
      drivers.push(`RSI ${lastRSI.toFixed(1)} · momentum alcista`);
    } else if (lastRSI > 55) {
      score += 12;
      drivers.push(`RSI ${lastRSI.toFixed(1)} · alcista moderado`);
    } else if (lastRSI > 45) {
      drivers.push(`RSI ${lastRSI.toFixed(1)} · neutral`);
    } else if (lastRSI > 35) {
      score -= 8;
      drivers.push(`RSI ${lastRSI.toFixed(1)} · bajista moderado`);
    } else if (lastRSI > 25) {
      score -= 4;
      drivers.push(`RSI ${lastRSI.toFixed(1)} · cerca sobreventa`);
    } else {
      score += 20;
      drivers.push(
        `RSI ${lastRSI.toFixed(1)} · sobreventa extrema · rebote esperado`,
      );
    }
  }

  const ema20Arr = ema(closes, 20);
  const ema50Arr = ema(closes, 50);
  const ema200Arr = ema(closes, 200);
  const e20 = ema20Arr[ema20Arr.length - 1] ?? null;
  const e50 = ema50Arr[ema50Arr.length - 1] ?? null;
  const e200 = ema200Arr[ema200Arr.length - 1] ?? null;

  if (e200 != null) {
    if (lp > e200) {
      score += 14;
      drivers.push(`Precio sobre EMA200 ($${Math.round(e200).toLocaleString()})`);
    } else {
      score -= 14;
      drivers.push(`Precio bajo EMA200 ($${Math.round(e200).toLocaleString()})`);
    }
  }
  if (e50 != null) {
    if (lp > e50) score += 8;
    else score -= 8;
  }
  if (e20 != null) {
    if (lp > e20) score += 6;
    else score -= 6;
  }

  if (e50 != null && e200 != null) {
    if (e50 > e200) {
      score += 8;
      drivers.push('EMA50 > EMA200 (bullish trend structure)');
    } else {
      score -= 8;
      drivers.push('EMA50 < EMA200 (bearish trend structure)');
    }
  }

  // Momentum
  const lookback = Math.min(20, Math.floor(closes.length / 4));
  const ref = closes[closes.length - 1 - lookback];
  if (ref != null && ref !== 0) {
    const recentChange = (lp / ref - 1) * 100;
    if (recentChange > 8) {
      score += 10;
      drivers.push(`+${recentChange.toFixed(1)}% reciente · momentum fuerte`);
    } else if (recentChange > 3) {
      score += 5;
      drivers.push(`+${recentChange.toFixed(1)}% reciente · momentum positivo`);
    } else if (recentChange < -8) {
      score -= 10;
      drivers.push(`${recentChange.toFixed(1)}% reciente · debilidad fuerte`);
    } else if (recentChange < -3) {
      score -= 5;
      drivers.push(`${recentChange.toFixed(1)}% reciente · debilidad`);
    }
  }

  // MACD
  const m = macd(closes);
  const lastMacd = m.macd[m.macd.length - 1] ?? null;
  const lastSig = m.signal[m.signal.length - 1] ?? null;
  const lastHist = m.histogram[m.histogram.length - 1] ?? null;
  const prevHist = m.histogram[m.histogram.length - 2] ?? null;
  if (lastMacd != null && lastSig != null) {
    if (lastMacd > lastSig) score += 6;
    else score -= 6;
    if (lastHist != null && prevHist != null) {
      if (lastHist > 0 && lastHist > prevHist) drivers.push('MACD histograma creciendo (bull momentum)');
      else if (lastHist < 0 && lastHist < prevHist)
        drivers.push('MACD histograma decreciente (bear momentum)');
    }
  }

  score = Math.max(-100, Math.min(100, score));
  let direction: TimeframeSignal['direction'] = 'neutral';
  if (score > 15) direction = 'up';
  else if (score < -15) direction = 'down';

  return {
    label,
    score,
    direction,
    drivers: drivers.slice(0, 3),
    lastRSI: lastRSI ?? undefined,
    e20,
    e50,
    e200,
  };
}

export const DEFAULT_HORIZONS: Record<'1h' | '4h' | '1d' | '1w', SignalLabel> = {
  '1h': { tf: '1H', horizon: 'Corto plazo · próximas horas' },
  '4h': { tf: '4H', horizon: 'Intradía · próximos días' },
  '1d': { tf: '1D', horizon: 'Swing · próximas semanas' },
  '1w': { tf: '1W', horizon: 'Posición · próximos meses' },
};
