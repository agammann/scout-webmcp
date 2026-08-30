import { sameCardVariant, sameMarketTier } from '@/src/domain/identity';
import type { MarketplaceListing, MarketStatistics, Money, Sale } from '@/src/domain/types';

import { dedupeSales } from './dedupe';
import { addMoney, money } from './money';

const medianNumber = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const percentile = (values: number[], ratio: number): number | undefined => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
};

const totalCents = (sale: Sale) => addMoney(sale.price, sale.shipping).amountCents;

function weightedMedian(entries: Array<{ value: number; weight: number }>): number | undefined {
  if (entries.length === 0) return undefined;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const target = sorted.reduce((sum, entry) => sum + entry.weight, 0) / 2;
  let running = 0;
  for (const entry of sorted) {
    running += entry.weight;
    if (running >= target) return entry.value;
  }
  return sorted.at(-1)?.value;
}

export function exactComparableSales(listing: MarketplaceListing, sales: Sale[]): Sale[] {
  return dedupeSales(sales).unique
    .filter(
      (sale) =>
        sale.price.currency === listing.price.currency &&
        sameCardVariant(sale.identity, listing.identity) &&
        sameMarketTier(sale.tier, listing.tier),
    )
    .sort((left, right) => Date.parse(right.soldAt) - Date.parse(left.soldAt));
}

function detectLogPriceAnomalies(sales: Sale[]): string[] {
  if (sales.length < 5) return [];
  const logs = sales.map((sale) => Math.log(totalCents(sale)));
  const median = medianNumber(logs);
  if (median === undefined) return [];
  const deviations = logs.map((value) => Math.abs(value - median));
  const mad = medianNumber(deviations) ?? 0;
  if (mad === 0) return [];
  return sales
    .filter((_, index) => (0.6745 * Math.abs(logs[index] - median)) / mad > 3.5)
    .map((sale) => sale.id);
}

const asMoney = (amount: number | undefined, currency: Money['currency']): Money | undefined =>
  amount === undefined ? undefined : money(amount, currency);

export function calculateMarketStatistics(
  listing: MarketplaceListing,
  sales: Sale[],
  asOf: string,
): { market: MarketStatistics; comparables: Sale[] } {
  const comparables = exactComparableSales(listing, sales);
  const asOfMs = Date.parse(asOf);
  const withinDays = (sale: Sale, days: number) => asOfMs - Date.parse(sale.soldAt) <= days * 86_400_000;
  const sales30 = comparables.filter((sale) => withinDays(sale, 30));
  const sales90 = comparables.filter((sale) => withinDays(sale, 90));
  const anomalySaleIds = detectLogPriceAnomalies(sales90);
  const anomalySet = new Set(anomalySaleIds);
  const cleaned90 = sales90.filter((sale) => !anomalySet.has(sale.id));
  const currency = listing.price.currency;
  const values30 = sales30.map(totalCents);
  const values90 = sales90.map(totalCents);
  const cleanedValues90 = cleaned90.map(totalCents);
  const enoughSales = cleaned90.length >= 3;
  const latestSale = comparables[0];
  const latestAgeDays = latestSale ? Math.max(0, (asOfMs - Date.parse(latestSale.soldAt)) / 86_400_000) : 365;
  const weighted = weightedMedian(
    cleaned90.map((sale) => {
      const age = Math.max(0, (asOfMs - Date.parse(sale.soldAt)) / 86_400_000);
      return { value: totalCents(sale), weight: Math.exp(-age / 45) };
    }),
  );
  const cleanedMedian = medianNumber(cleanedValues90);
  const q1 = percentile(cleanedValues90, 0.25);
  const q3 = percentile(cleanedValues90, 0.75);
  const dispersion =
    cleanedMedian && q1 !== undefined && q3 !== undefined
      ? Math.max(0, 100 - ((q3 - q1) / cleanedMedian) * 200)
      : 0;
  const sampleScore = Math.min(100, (cleaned90.length / 12) * 100);
  const recencyScore = Math.max(0, 100 - latestAgeDays * 2.25);
  const confidenceScore = Math.round(
    0.35 * 100 + 0.25 * sampleScore + 0.2 * recencyScore + 0.2 * dispersion,
  );
  const confidenceLabel = confidenceScore >= 80 ? 'HIGH' : confidenceScore >= 55 ? 'MEDIUM' : 'LOW';

  return {
    comparables,
    market: {
      currency,
      latestSale,
      median30: sales30.length >= 3 ? asMoney(medianNumber(values30), currency) : undefined,
      median90: enoughSales ? asMoney(cleanedMedian, currency) : undefined,
      weightedMedian90: enoughSales ? asMoney(weighted, currency) : undefined,
      count30: sales30.length,
      count90: sales90.length,
      low90: asMoney(values90.length ? Math.min(...values90) : undefined, currency),
      high90: asMoney(values90.length ? Math.max(...values90) : undefined, currency),
      cleanedLow90: asMoney(cleanedValues90.length ? Math.min(...cleanedValues90) : undefined, currency),
      cleanedHigh90: asMoney(cleanedValues90.length ? Math.max(...cleanedValues90) : undefined, currency),
      anomalySaleIds,
      liquidityScore: Math.round(Math.min(100, (sales90.length / 12) * 100)),
      confidenceScore,
      confidenceLabel,
      asOf,
    },
  };
}

