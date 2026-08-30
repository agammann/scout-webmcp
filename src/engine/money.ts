import type { Money } from '@/src/domain/types';

export function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} and ${right.currency}`);
  }
}

export function addMoney(left: Money, right?: Money): Money {
  if (!right) return { ...left };
  assertSameCurrency(left, right);
  return { amountCents: left.amountCents + right.amountCents, currency: left.currency };
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return { amountCents: left.amountCents - right.amountCents, currency: left.currency };
}

export function money(amountCents: number, currency: Money['currency'] = 'USD'): Money {
  return { amountCents: Math.round(amountCents), currency };
}

export function formatMoney(value?: Money): string {
  if (!value) return 'Unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: value.currency,
  }).format(value.amountCents / 100);
}

export function formatPercent(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return `${Math.abs(value).toFixed(1)}% ${value < 0 ? 'below' : value > 0 ? 'above' : 'at market'}`;
}

