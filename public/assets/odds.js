// Odds maths for the free tools. Pure functions, shared by the page and tests.

// "5/2", "evens", "3.5", "+250", "-150" -> decimal odds, or null.
export function parseOdds(input) {
  const s = String(input ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'evens' || s === 'evs' || s === 'even') return 2;
  let m = s.match(/^(\d+(?:\.\d+)?)\s*[/-]\s*(\d+(?:\.\d+)?)$/);
  if (m && Number(m[2]) > 0) return 1 + Number(m[1]) / Number(m[2]);
  m = s.match(/^([+-])(\d+(?:\.\d+)?)$/);
  if (m) {
    const n = Number(m[2]);
    if (n < 100) return null;
    return m[1] === '+' ? 1 + n / 100 : 1 + 100 / n;
  }
  m = s.match(/^\d+(?:\.\d+)?$/);
  if (m && Number(s) > 1) return Number(s);
  return null;
}

// Nearest bookmaker-style fraction (denominator up to 20, or n/1 for big prices).
export function toFractional(decimal) {
  const f = decimal - 1;
  if (Math.abs(f - 1) < 1e-9) return 'Evens';
  if (f >= 20) return `${Math.round(f)}/1`;
  let best = [Math.round(f), 1];
  let err = Math.abs(f - best[0]);
  for (let d = 2; d <= 20; d++) {
    const n = Math.round(f * d);
    const e = Math.abs(f - n / d);
    if (n > 0 && e < err - 1e-9) {
      best = [n, d];
      err = e;
    }
  }
  return `${best[0]}/${best[1]}`;
}

export const impliedPct = (decimal) => `${(100 / decimal).toFixed(1)}%`;

export function accaReturns(decimals, stake) {
  const decimal = decimals.reduce((a, b) => a * b, 1);
  const returns = stake * decimal;
  return { decimal, returns, profit: returns - stake };
}
