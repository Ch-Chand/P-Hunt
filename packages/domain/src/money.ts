/** Integer pence; rates are integer basis points (100 bps = 1%). */
export type Pence = number;

export function assertSafeInteger(value: number): number {
  if (!Number.isSafeInteger(value)) throw new RangeError('Money arithmetic exceeds safe integer precision.');
  return value;
}

/** Round a rational half away from zero, using BigInt throughout. */
export function divideHalfUp(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) throw new RangeError('Denominator must be positive.');
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return assertSafeInteger(Number(sign * ((absolute + denominator / 2n) / denominator)));
}

/** Controlled decimal parsing: no Number(decimal) × 100 conversion. */
export function parseGbpToPence(text: string): Pence {
  const cleaned = text.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(cleaned)) {
    throw new Error('Enter a non-negative GBP amount with at most two decimal places.');
  }
  const [whole = '0', fraction = ''] = cleaned.split('.');
  return assertSafeInteger(Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))));
}

export function parsePercentToBps(text: string): number {
  const value = parseGbpToPence(text);
  if (value > 10_000) throw new RangeError('Percentage must be between 0 and 100.');
  return value;
}

export function applyRate(pence: number, rateBps: number): Pence {
  assertSafeInteger(pence);
  if (!Number.isSafeInteger(rateBps) || rateBps < 0 || rateBps > 10_000) throw new RangeError('Rate must be integer basis points between 0 and 10000.');
  return divideHalfUp(BigInt(pence) * BigInt(rateBps), 10_000n);
}

export function formatGbp(pence: number | null): string {
  return pence === null ? 'Not verified' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

export function formatMargin(marginBps: number | null): string {
  return marginBps === null ? 'Not verified' : `${(marginBps / 100).toFixed(1)}%`;
}
