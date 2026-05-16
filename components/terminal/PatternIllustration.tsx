'use client';
import type { PatternKey } from '@/lib/pattern-projections';

interface Props {
  pattern: PatternKey;
  size?: 'sm' | 'lg';
  detected?: boolean;
}

const COLORS = {
  up: '#00d68f',
  down: '#ff4757',
  neutral: '#8a8a8a',
  warn: '#ffb800',
  brand: '#f7931a',
  grid: 'rgba(255,255,255,0.04)',
};

/**
 * Inline SVG illustrations of each technical pattern. Used both as small
 * thumbnails inside cards and as the larger image rendered on hover.
 */
export function PatternIllustration({ pattern, size = 'sm', detected = true }: Props) {
  const w = size === 'sm' ? 100 : 220;
  const h = size === 'sm' ? 40 : 110;
  const opacity = detected ? 1 : 0.35;
  const common = {
    width: w,
    height: h,
    viewBox: '0 0 100 40',
    preserveAspectRatio: 'none' as const,
    style: { opacity },
    'aria-hidden': true,
  };

  switch (pattern) {
    case 'higherHighs':
      return (
        <svg {...common}>
          <defs>
            <marker id={`hh-arrow`} viewBox="0 0 6 6" refX="3" refY="3" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0 L6 3 L0 6 Z" fill={COLORS.up} />
            </marker>
          </defs>
          {/* Two ascending peaks with rising trendline */}
          <polyline
            points="2,30 14,18 26,26 40,10 52,22 66,4 80,16 98,6"
            fill="none"
            stroke={COLORS.up}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line x1="14" y1="18" x2="98" y2="2" stroke={COLORS.up} strokeWidth="0.6" strokeDasharray="3 2" opacity="0.6" />
          <circle cx="14" cy="18" r="1.6" fill={COLORS.up} />
          <circle cx="40" cy="10" r="1.6" fill={COLORS.up} />
          <circle cx="66" cy="4" r="1.6" fill={COLORS.up} />
        </svg>
      );
    case 'higherLows':
      return (
        <svg {...common}>
          <polyline
            points="2,12 14,26 26,18 40,32 52,22 66,36 80,28 98,38"
            fill="none"
            stroke={COLORS.up}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Rising support line */}
          <line x1="14" y1="26" x2="98" y2="38" stroke={COLORS.up} strokeWidth="0.6" strokeDasharray="3 2" opacity="0.6" />
          <circle cx="14" cy="26" r="1.6" fill={COLORS.up} />
          <circle cx="40" cy="32" r="1.6" fill={COLORS.up} />
          <circle cx="66" cy="36" r="1.6" fill={COLORS.up} />
          <circle cx="80" cy="28" r="1.6" fill={COLORS.up} />
        </svg>
      );
    case 'lowerHighs':
      return (
        <svg {...common}>
          <polyline
            points="2,4 14,16 26,8 40,22 52,14 66,28 80,20 98,34"
            fill="none"
            stroke={COLORS.down}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line x1="14" y1="16" x2="98" y2="34" stroke={COLORS.down} strokeWidth="0.6" strokeDasharray="3 2" opacity="0.6" />
          <circle cx="14" cy="16" r="1.6" fill={COLORS.down} />
          <circle cx="40" cy="22" r="1.6" fill={COLORS.down} />
          <circle cx="66" cy="28" r="1.6" fill={COLORS.down} />
        </svg>
      );
    case 'lowerLows':
      return (
        <svg {...common}>
          <polyline
            points="2,12 14,28 26,18 40,32 52,22 66,36 80,28 98,38"
            fill="none"
            stroke={COLORS.down}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line x1="14" y1="28" x2="98" y2="40" stroke={COLORS.down} strokeWidth="0.6" strokeDasharray="3 2" opacity="0.6" />
          <circle cx="14" cy="28" r="1.6" fill={COLORS.down} />
          <circle cx="40" cy="32" r="1.6" fill={COLORS.down} />
          <circle cx="66" cy="36" r="1.6" fill={COLORS.down} />
        </svg>
      );
    case 'bollingerSqueeze':
      return (
        <svg {...common}>
          {/* Upper band converging to lower band */}
          <line x1="2" y1="2" x2="98" y2="18" stroke={COLORS.neutral} strokeWidth="0.8" strokeDasharray="3 2" />
          <line x1="2" y1="38" x2="98" y2="22" stroke={COLORS.neutral} strokeWidth="0.8" strokeDasharray="3 2" />
          {/* Price line inside */}
          <polyline
            points="2,22 16,17 30,24 44,18 58,22 72,19 86,22 98,20"
            fill="none"
            stroke={COLORS.warn}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Mid line */}
          <line x1="2" y1="20" x2="98" y2="20" stroke={COLORS.warn} strokeWidth="0.4" opacity="0.4" />
        </svg>
      );
    case 'rsiDivBullish':
      return (
        <svg {...common}>
          {/* Top: price making lower lows */}
          <polyline
            points="2,10 18,18 34,12 50,22 66,16 82,26 98,20"
            fill="none"
            stroke={COLORS.down}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          {/* Bottom: RSI making higher lows */}
          <polyline
            points="2,38 18,32 34,36 50,28 66,32 82,24 98,28"
            fill="none"
            stroke={COLORS.up}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          {/* Divergence arrows */}
          <line x1="18" y1="18" x2="82" y2="26" stroke={COLORS.down} strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="18" y1="32" x2="82" y2="24" stroke={COLORS.up} strokeWidth="0.5" strokeDasharray="2 2" />
        </svg>
      );
    case 'rsiDivBearish':
      return (
        <svg {...common}>
          {/* Top: price making higher highs */}
          <polyline
            points="2,30 18,22 34,28 50,18 66,24 82,12 98,18"
            fill="none"
            stroke={COLORS.up}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          {/* Bottom: RSI making lower highs */}
          <polyline
            points="2,18 18,10 34,16 50,12 66,18 82,16 98,22"
            fill="none"
            stroke={COLORS.down}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <line x1="18" y1="22" x2="82" y2="12" stroke={COLORS.up} strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="18" y1="10" x2="82" y2="16" stroke={COLORS.down} strokeWidth="0.5" strokeDasharray="2 2" />
        </svg>
      );
    case 'macdActivity':
      return (
        <svg {...common}>
          {/* MACD line */}
          <polyline
            points="2,22 14,12 26,30 38,16 50,26 62,14 74,28 86,18 98,24"
            fill="none"
            stroke={COLORS.brand}
            strokeWidth="1.4"
          />
          {/* Signal line */}
          <polyline
            points="2,20 14,20 26,20 38,22 50,20 62,22 74,20 86,22 98,20"
            fill="none"
            stroke={COLORS.neutral}
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          {/* Cross markers */}
          {[10, 30, 46, 62, 78].map(x => (
            <circle key={x} cx={x} cy="20" r="1.5" fill={COLORS.warn} />
          ))}
        </svg>
      );
  }
}
