import type { NewsSentiment } from './types';

export const BULL_KW = [
  'rally', 'surge', 'breakout', 'soar', 'all-time high', 'ath ', ' ath', 'inflow', 'inflows',
  'adoption', 'approve', 'approved', 'accumulate', 'accumulation', 'rises', 'rising', 'gain',
  'gains', 'bullish', 'support', 'pump', 'launch', 'green', 'jump', 'jumps', 'climb', 'climbs',
  'record', 'breakthrough', 'whale buying', 'institutional', 'etf inflow', 'positive',
  'optimistic', 'bull', 'upgrade', 'strong',
];

export const BEAR_KW = [
  'crash', 'plunge', 'drops', 'drop', 'fall', 'falls', 'decline', 'sell-off', 'outflow',
  'outflows', 'bearish', 'dump', 'dumps', 'fear', 'panic', 'ban', 'hack', 'exploit',
  'liquidation', 'liquidate', 'red', 'tumble', 'sink', 'drag', 'plunges', 'correction',
  'warning', 'threat', 'scam', 'fraud', 'whale dumping', 'bear', 'downgrade', 'weak', 'plummet',
  'slump',
];

export function classifyNews(title: string | null | undefined, body: string | null | undefined): NewsSentiment {
  const text = ((title ?? '') + ' ' + (body ?? '')).toLowerCase();
  let bull = 0;
  let bear = 0;
  for (const k of BULL_KW) if (text.includes(k)) bull++;
  for (const k of BEAR_KW) if (text.includes(k)) bear++;
  if (bull > bear + 1) return 'bull';
  if (bear > bull + 1) return 'bear';
  return 'neutral';
}
