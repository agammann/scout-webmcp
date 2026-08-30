import { describe, expect, it } from 'vitest';

import { CardMarketService, createDemoCardMarketService } from '@/src/services/card-market-service';
import { DEMO_AS_OF, demoCards, demoListings, demoSales, demoSellers } from '@/src/providers/demo/data';

describe('CardMarketService vertical slice', () => {
  it('groups listings by normalized card and removes duplicate listing exposure', () => {
    const service = createDemoCardMarketService();
    expect(service.allListings()).toHaveLength(10);
    expect(service.duplicateListingGroups).toContainEqual([
      'listing-hf-8820',
      'listing-cc-8820-duplicate',
    ]);
    const result = service.searchCards({ query: 'Ember Dragon ex', limit: 20 });
    expect(result.synthetic).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].listingCount).toBe(6);
  });

  it('filters exact graded deals by budget, trust, grade, and below-market threshold', () => {
    const service = createDemoCardMarketService();
    const result = service.findDeals({
      query: 'Ember Dragon ex',
      maxTotalCents: 50_000,
      gradingCompany: 'CGC',
      grade: 10,
      minimumSellerTrust: 90,
      minimumPercentBelowMarket: 5,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].listing.id).toBe('listing-hf-1042');
    expect(result.data[0].deal.totalAcquisition.amountCents).toBe(42500);
  });

  it('compares two to five unique listings and rejects invalid comparison sizes', () => {
    const service = createDemoCardMarketService();
    const result = service.compareListings(['listing-hf-1042', 'listing-cc-8841']);
    expect(result.data.assessments).toHaveLength(2);
    expect(result.data.strongestListingId).toBeDefined();
    expect(() => service.compareListings(['listing-hf-1042'])).toThrow(/between 2 and 5/);
  });

  it('shows raw and graded tiers separately', () => {
    const result = createDemoCardMarketService().compareRawVsGraded('card-ember-dragon-ex');
    expect(result.data.raw).toHaveLength(1);
    expect(result.data.graded).toHaveLength(4);
    expect(result.data.note).toMatch(/never pooled/);
  });

  it('rejects a snapshot that attempts to introduce live mode', () => {
    expect(
      () =>
        new CardMarketService({
          cards: demoCards,
          listings: demoListings,
          sales: demoSales,
          sellers: demoSellers,
          statuses: [
            {
              id: 'live-provider',
              label: 'Live provider',
              dataMode: 'LIVE',
              enabled: true,
              synthetic: false,
              capabilities: {
                catalog: true,
                currentListings: true,
                individualSales: true,
                sellers: true,
                sellerReviews: false,
                population: false,
              },
            },
          ],
          asOf: DEMO_AS_OF,
        }),
    ).toThrow(/only SYNTHETIC/);
  });
});

