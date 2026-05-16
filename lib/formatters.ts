export const fmtUSD = (v: number): string => '$' + Math.round(v).toLocaleString('en-US');

export const fmtUSDc = (v: number): string =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPct = (v: number): string => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

export const fmtBig = (v: number): string => {
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  return fmtUSD(v);
};

export const fmtTime = (ms: number): string => {
  const d = new Date(ms);
  return d.toLocaleTimeString('es-MX', { hour12: false });
};

export const fmtRelative = (epochSec: number): string => {
  const diff = Date.now() / 1000 - epochSec;
  if (diff < 60) return `hace ${Math.floor(diff)}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
};

export const fmtDate = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear().toString().slice(2)}`;
};
