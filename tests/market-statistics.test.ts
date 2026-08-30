import { describe, expect, it } from 'vitest';

import { calculateMarketStatistics, exactComparableSales } from '@/src/engine/market-statistics';
import { DEMO_AS_OF, demoListings, demoSales } from '@/src/providers/demo/data';

const cgc10Listing = demoListings.find((listing) => listing.id === 'listing-hf-1042')!;

describe('comparable-sale statistics', () => {
  it('matches only the exact card variant, grading company, and grade', () => {
    const sales = exactComparableSales(cgc10Listing, demoSales);
    expect(sales).toHaveLength(12);
    expect(sales.every((sale) => sale.tier.kind === 'GRADED' && sale.tier.company === 'CGC' && sale.tier.grade === 10)).toBe(true);
  });

  it('calculates shipping-inclusive windows and excludes an extreme anomaly from the robust median', () => {
    const { market } = calculateMarketStatistics(cgc10Listing, demoSales, DEMO_AS_OF);
    expect(market.count30).toBe(5);
    expect(market.count90).toBe(12);
    expect(market.latestSale?.id).toBe('sale-ember-cgc10-1');
    expect(market.median30?.amountCents).toBe(46800);
    expect(market.median90?.amountCents).toBe(46800);
    expect(market.anomalySaleIds).toEqual(['sale-ember-cgc10-12']);
    expect(market.high90?.amountCents).toBe(92000);
    expect(market.cleanedHigh90?.amountCents).toBe(49500);
  });

  it('withholds rolling medians when the matching sample is too small', () => {
    const { market } = calculateMarketStatistics(cgc10Listing, demoSales.slice(0, 2), DEMO_AS_OF);
    expect(market.latestSale).toBeDefined();
    expect(market.median30).toBeUndefined();
    expect(market.median90).toBeUndefined();
  });
});

