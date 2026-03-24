/**
 * Formats a number with k/m suffixes.
 * 0-999: shown as-is
 * 1,000-999,999: shown as 1k-999.99k (up to 2 decimal places, trailing zeros removed)
 * 1,000,000+: shown as 1m+
 */
export const formatCount = (count: number | undefined): string => {
  const n = count || 0;
  if (n < 1000) return n.toString();
  if (n < 1000000) {
    const k = n / 1000;
    // Show up to 2 decimal places, remove trailing zeros
    const formatted = k % 1 === 0 ? k.toFixed(0) : parseFloat(k.toFixed(2)).toString();
    return `${formatted}k`;
  }
  const m = n / 1000000;
  const formatted = m % 1 === 0 ? m.toFixed(0) : parseFloat(m.toFixed(2)).toString();
  return `${formatted}m`;
};
