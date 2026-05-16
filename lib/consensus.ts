import {
  ema,
  rsi,
  macd,
  stochastic,
  bollinger,
  williamsR,
  cci,
  adx,
  mfi,
  ichimoku,
} from './indicators';
import { fmtUSD } from './formatters';
import type {
  ConsensusResult,
  IndicatorResult,
  IndicatorSignal,
  Kline,
  Verdict,
} from './types';

export interface ConsensusOptions {
  /** Net news sentiment score in `[-100, +100]` from the news aggregator. Optional. */
  newsNetScore?: number | null;
}

const labelFor = (s: IndicatorSignal): string => {
  switch (s) {
    case 2:
      return 'STRONG BUY';
    case 1:
      return 'BUY';
    case 0:
      return 'NEUTRAL';
    case -1:
      return 'SELL';
    case -2:
      return 'STRONG SELL';
  }
};

const last = <T,>(arr: ReadonlyArray<T>): T | undefined => arr[arr.length - 1];
const prev = <T,>(arr: ReadonlyArray<T>): T | undefined => arr[arr.length - 2];

export function generateConsensus(
  daily: Kline[],
  opts: ConsensusOptions = {},
): ConsensusResult {
  const closes = daily.map(k => k.close);
  const highs = daily.map(k => k.high);
  const lows = daily.map(k => k.low);
  const volumes = daily.map(k => k.volume);
  const lp = closes[closes.length - 1] ?? 0;
  const inds: IndicatorResult[] = [];

  const push = (name: string, value: string, signal: IndicatorSignal, note: string) =>
    inds.push({ name, value, signal, label: labelFor(signal), note });

  // 1 · RSI(14)
  const rArr = rsi(closes, 14);
  const lastR = last(rArr);
  {
    let s: IndicatorSignal = 0;
    let n = 'Sin dirección clara';
    if (lastR != null) {
      if (lastR > 75) {
        s = -2;
        n = 'Sobrecompra extrema · pullback probable';
      } else if (lastR > 70) {
        s = -1;
        n = 'Sobrecompra · vigilar reversión';
      } else if (lastR < 25) {
        s = 2;
        n = 'Sobreventa extrema · rebote probable';
      } else if (lastR < 30) {
        s = 1;
        n = 'Sobreventa · zona de compra';
      } else if (lastR > 55) {
        s = 0;
        n = 'Momentum alcista en zona neutral';
      } else if (lastR < 45) {
        s = 0;
        n = 'Momentum bajista en zona neutral';
      }
    }
    push('RSI (14)', lastR != null ? lastR.toFixed(2) : '--', s, n);
  }

  // 2 · MACD(12,26,9)
  const m = macd(closes);
  const lm = last(m.macd);
  const ls = last(m.signal);
  const lh = last(m.histogram);
  const ph = prev(m.histogram);
  {
    let s: IndicatorSignal = 0;
    let n = 'Convergencia · sin señal';
    if (lm != null && ls != null && lh != null && ph != null) {
      if (lm > ls && lh > 0 && lh > ph) {
        s = 2;
        n = 'Histograma alcista creciendo';
      } else if (lm > ls && lh > 0) {
        s = 1;
        n = 'Sobre línea de señal';
      } else if (lm < ls && lh < 0 && lh < ph) {
        s = -2;
        n = 'Histograma bajista profundizando';
      } else if (lm < ls) {
        s = -1;
        n = 'Bajo línea de señal';
      }
    }
    const macdValue = lm != null ? (lm >= 0 ? '+' : '') + lm.toFixed(1) : '--';
    push('MACD (12,26,9)', macdValue, s, n);
  }

  // 3 · Stochastic (14,3)
  const st = stochastic(highs, lows, closes, 14, 3);
  const lk = last(st.k);
  const ld = last(st.d);
  const pk = prev(st.k);
  {
    let s: IndicatorSignal = 0;
    let n = 'Sin señal';
    if (lk != null && ld != null && pk != null) {
      if (lk > 80 && lk < pk && lk < ld) {
        s = -2;
        n = 'Cruce bajista en sobrecompra';
      } else if (lk > 80) {
        s = -1;
        n = 'Sobrecompra';
      } else if (lk < 20 && lk > pk && lk > ld) {
        s = 2;
        n = 'Cruce alcista en sobreventa';
      } else if (lk < 20) {
        s = 1;
        n = 'Sobreventa';
      } else if (lk > ld) {
        s = 0;
        n = `%K ${lk.toFixed(0)} sobre %D`;
      } else {
        s = 0;
        n = `%K ${lk.toFixed(0)} bajo %D`;
      }
    }
    push('Stochastic (14,3)', lk != null ? lk.toFixed(1) : '--', s, n);
  }

  // 4 · Bollinger Bands (20,2)
  const bb = bollinger(closes, 20, 2);
  const bu = last(bb.upper);
  const bl = last(bb.lower);
  const bm = last(bb.mid);
  {
    let s: IndicatorSignal = 0;
    let n = '—';
    if (bu != null && bl != null && bm != null) {
      const bbPct = ((lp - bl) / (bu - bl)) * 100;
      if (lp > bu) {
        s = -1;
        n = 'Sobre banda superior · reversión';
      } else if (lp < bl) {
        s = 1;
        n = 'Bajo banda inferior · rebote';
      } else if (bbPct > 85) {
        s = -1;
        n = 'Tocando techo del rango';
      } else if (bbPct < 15) {
        s = 1;
        n = 'Tocando suelo del rango';
      } else {
        s = 0;
        n = `${bbPct.toFixed(0)}% del rango`;
      }
    }
    push('Bollinger Bands (20)', bm != null ? fmtUSD(bm) : '--', s, n);
  }

  // 5 · EMA Cross (50/200)
  const e50A = ema(closes, 50);
  const e200A = ema(closes, 200);
  const e50 = last(e50A) ?? null;
  const e200 = last(e200A) ?? null;
  const pe50 = prev(e50A) ?? null;
  const pe200 = prev(e200A) ?? null;
  {
    let s: IndicatorSignal = 0;
    let n = 'Entre EMAs';
    if (pe50 != null && pe200 != null && e50 != null && e200 != null && pe50 <= pe200 && e50 > e200) {
      s = 2;
      n = 'GOLDEN CROSS reciente';
    } else if (
      pe50 != null &&
      pe200 != null &&
      e50 != null &&
      e200 != null &&
      pe50 >= pe200 &&
      e50 < e200
    ) {
      s = -2;
      n = 'DEATH CROSS reciente';
    } else if (e50 != null && e200 != null && lp > e50 && e50 > e200) {
      s = 2;
      n = 'Estructura alcista plena';
    } else if (e50 != null && lp > e50) {
      s = 1;
      n = 'Sobre EMA50';
    } else if (e50 != null && e200 != null && lp < e50 && e50 < e200) {
      s = -2;
      n = 'Estructura bajista plena';
    } else if (e200 != null && lp < e200) {
      s = -1;
      n = 'Bajo EMA200';
    }
    push('EMA 50 / 200', e50 != null ? fmtUSD(e50) : '--', s, n);
  }

  // 6 · Williams %R
  const wr = williamsR(highs, lows, closes, 14);
  const lw = last(wr);
  {
    let s: IndicatorSignal = 0;
    let n = 'En zona media';
    if (lw != null) {
      if (lw > -10) {
        s = -2;
        n = 'Sobrecompra extrema';
      } else if (lw > -20) {
        s = -1;
        n = 'Sobrecompra';
      } else if (lw < -90) {
        s = 2;
        n = 'Sobreventa extrema';
      } else if (lw < -80) {
        s = 1;
        n = 'Sobreventa';
      }
    }
    push('Williams %R (14)', lw != null ? lw.toFixed(1) : '--', s, n);
  }

  // 7 · CCI (20)
  const cArr = cci(highs, lows, closes, 20);
  const lc = last(cArr);
  {
    let s: IndicatorSignal = 0;
    let n = 'En rango normal';
    if (lc != null) {
      if (lc > 200) {
        s = -2;
        n = 'Extremo alcista · reversión';
      } else if (lc > 100) {
        s = -1;
        n = 'Sobrecompra';
      } else if (lc < -200) {
        s = 2;
        n = 'Extremo bajista · rebote';
      } else if (lc < -100) {
        s = 1;
        n = 'Sobreventa';
      }
    }
    push('CCI (20)', lc != null ? lc.toFixed(0) : '--', s, n);
  }

  // 8 · ADX (14)
  const a = adx(highs, lows, closes, 14);
  const lA = last(a.adx);
  const lP = last(a.plusDI);
  const lM = last(a.minusDI);
  {
    let s: IndicatorSignal = 0;
    let n = 'Datos insuficientes';
    if (lA != null && lP != null && lM != null) {
      if (lA > 40) {
        if (lP > lM) {
          s = 2;
          n = `Tendencia alcista fuerte (ADX ${lA.toFixed(0)})`;
        } else {
          s = -2;
          n = `Tendencia bajista fuerte (ADX ${lA.toFixed(0)})`;
        }
      } else if (lA > 25) {
        if (lP > lM) {
          s = 1;
          n = `Tendencia alcista (ADX ${lA.toFixed(0)})`;
        } else {
          s = -1;
          n = `Tendencia bajista (ADX ${lA.toFixed(0)})`;
        }
      } else {
        s = 0;
        n = `Sin tendencia clara (ADX ${lA.toFixed(0)})`;
      }
    }
    push('ADX (14)', lA != null ? lA.toFixed(1) : '--', s, n);
  }

  // 9 · MFI (14)
  const mArr = mfi(highs, lows, closes, volumes, 14);
  const lmfi = last(mArr);
  {
    let s: IndicatorSignal = 0;
    let n = 'Flujo equilibrado';
    if (lmfi != null) {
      if (lmfi > 80) {
        s = -1;
        n = 'Sobrecompra de volumen';
      } else if (lmfi < 20) {
        s = 1;
        n = 'Sobreventa de volumen';
      } else if (lmfi > 60) {
        s = 0;
        n = 'Flujo positivo';
      } else if (lmfi < 40) {
        s = 0;
        n = 'Flujo negativo';
      }
    }
    push('MFI (14)', lmfi != null ? lmfi.toFixed(1) : '--', s, n);
  }

  // 10 · Ichimoku (Tenkan/Kijun)
  const ich = ichimoku(highs, lows);
  const t = last(ich.tenkan);
  const k = last(ich.kijun);
  const pt = prev(ich.tenkan);
  const pk2 = prev(ich.kijun);
  {
    let s: IndicatorSignal = 0;
    let n = 'Sin alineación clara';
    if (pt != null && pk2 != null && t != null && k != null && pt <= pk2 && t > k) {
      s = 2;
      n = 'Cruce alcista Tenkan/Kijun';
    } else if (pt != null && pk2 != null && t != null && k != null && pt >= pk2 && t < k) {
      s = -2;
      n = 'Cruce bajista Tenkan/Kijun';
    } else if (t != null && k != null && t > k && lp > t) {
      s = 1;
      n = 'Tenkan > Kijun + precio arriba';
    } else if (t != null && k != null && t < k && lp < t) {
      s = -1;
      n = 'Tenkan < Kijun + precio abajo';
    }
    push('Ichimoku (9/26)', t != null ? fmtUSD(t) : '--', s, n);
  }

  // 11 · Sentiment de noticias (opcional, soft blend)
  if (opts.newsNetScore != null) {
    const ns = Math.max(-100, Math.min(100, Math.round(opts.newsNetScore)));
    let s: IndicatorSignal = 0;
    let n = `Sentiment neutro (${ns >= 0 ? '+' : ''}${ns})`;
    if (ns >= 40) {
      s = 2;
      n = `Sentiment muy bullish (+${ns}) · flujo narrativo positivo`;
    } else if (ns >= 15) {
      s = 1;
      n = `Sentiment bullish (+${ns}) · titulares favorables`;
    } else if (ns <= -40) {
      s = -2;
      n = `Sentiment muy bearish (${ns}) · narrativa negativa`;
    } else if (ns <= -15) {
      s = -1;
      n = `Sentiment bearish (${ns}) · titulares adversos`;
    }
    push('Sentiment Noticias', `${ns >= 0 ? '+' : ''}${ns}`, s, n);
  }

  // ── AGGREGATE ──
  const totalScore = inds.reduce((acc, i) => acc + i.signal, 0);
  const buyCount = inds.filter(i => i.signal > 0).length;
  const sellCount = inds.filter(i => i.signal < 0).length;
  const neutralCount = inds.filter(i => i.signal === 0).length;

  // Thresholds escalan con el número de indicadores:
  // STRONG ≈ 60 % del máximo posible (max = #indicators × 2).
  const maxScore = inds.length * 2;
  const strongThreshold = Math.ceil(maxScore * 0.6);

  let verdict: Verdict;
  let verdictClass: string;
  let verdictNote: string;
  if (totalScore >= strongThreshold) {
    verdict = 'STRONG_BUY';
    verdictClass = 'strong-buy';
    verdictNote =
      'Consenso técnico fuertemente alcista · setup de compra alta convicción.';
  } else if (totalScore >= 5) {
    verdict = 'BUY';
    verdictClass = 'buy';
    verdictNote = 'Sesgo técnico alcista · setup de compra moderada.';
  } else if (totalScore <= -strongThreshold) {
    verdict = 'STRONG_SELL';
    verdictClass = 'strong-sell';
    verdictNote =
      'Consenso técnico fuertemente bajista · setup de venta alta convicción.';
  } else if (totalScore <= -5) {
    verdict = 'SELL';
    verdictClass = 'sell';
    verdictNote = 'Sesgo técnico bajista · setup de venta moderada.';
  } else {
    verdict = 'HOLD';
    verdictClass = 'hold';
    verdictNote =
      'Sin consenso direccional · mercado en zona neutral, esperar señales.';
  }

  const levels = computeLevels(lp, totalScore, bl ?? null, bu ?? null, e50);

  return {
    verdict,
    verdictClass,
    verdictNote,
    totalScore,
    maxScore,
    buyCount,
    sellCount,
    neutralCount,
    indicators: inds,
    levels,
    lastPrice: lp,
    timestamp: Date.now(),
    includesSentiment: opts.newsNetScore != null,
  };
}

export function computeLevels(
  price: number,
  totalScore: number,
  bbLower: number | null,
  bbUpper: number | null,
  ema50: number | null,
): ConsensusResult['levels'] {
  const isBuy = totalScore >= 5;
  const isSell = totalScore <= -5;

  const lowerCandidates = [
    bbLower ?? Infinity,
    ema50 ?? Infinity,
    price * 0.94,
  ];
  const upperCandidates = [
    bbUpper ?? -Infinity,
    ema50 ?? -Infinity,
    price * 1.06,
  ];
  const stopFloor = Math.min(...lowerCandidates);
  const stopCeil = Math.max(...upperCandidates);

  return {
    entry: { from: price * 0.995, to: price * 1.005 },
    stop: isBuy ? stopFloor : isSell ? stopCeil : price * 0.95,
    tp1: isBuy ? price * 1.05 : isSell ? price * 0.95 : price * 1.03,
    tp2: isBuy ? price * 1.1 : isSell ? price * 0.9 : price * 1.06,
    tp3: isBuy ? price * 1.18 : isSell ? price * 0.82 : price * 1.1,
  };
}
