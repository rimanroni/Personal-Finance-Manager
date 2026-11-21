/** Safe arithmetic for the amount field: 500+120, 1200/2, (80+20)*3. */
export function evalAmount(input: string): number | null {
  const s = input.replace(/৳|\s|,/g, '').replace(/×/g, '*').replace(/÷/g, '/');
  if (!s) return null;
  if (!/^[0-9+\-*/().]+$/.test(s)) return null;
  try {
    // Function constructor is confined to the sanitized numeric expression above.
    const value = Function(`"use strict";return (${s})`)() as unknown;
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  } catch {
    return null;
  }
}

/** Amount to save: evaluates an expression when there is one, else a plain number. */
export function amountValue(input: string): number {
  const direct = Number(input.replace(/,/g, ''));
  if (Number.isFinite(direct) && /^[0-9.,]+$/.test(input.trim())) return direct;
  return evalAmount(input) ?? Number.NaN;
}
