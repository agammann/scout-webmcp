import { describe, expect, it } from 'vitest';
import {
  cardVariantKey,
  matchesSearch,
  sameMarketTier,
} from '@/src/domain/identity';
import { dedupeSales, dedupeListings } from '@/src/engine/dedupe';
import { calculateMarketStatistics } from '@/src/engine/market-statistics';
import {
  demoCards,
  demoListings,
  demoSales,
  demoSellers,
  DEMO_AS_OF,
} from '@/src/providers/demo/data';
import {
  CardMarketService,
  createDemoCardMarketService,
} from '@/src/services/card-market-service';
import {
  createWebMcpTools,
  registerScoutWebMcp,
  type WebMcpDocumentLike,
} from '@/src/webmcp/register-tools';

const listing = demoListings.find((item) => item.id === 'listing-hf-1042')!;
const snapshot = () => ({
  cards: demoCards,
  listings: demoListings,
  sales: demoSales,
  sellers: demoSellers,
  statuses: createDemoCardMarketService().providerStatuses(),
  asOf: DEMO_AS_OF,
});
const sale = (index: number, amountCents = 10000, age = 5) => ({
  ...demoSales[0],
  id: `test-${index}`,
  externalId: `test-${index}`,
  sourceUrl: undefined,
  price: { amountCents, currency: 'USD' as const },
  shipping: { amountCents: 0, currency: 'USD' as const },
  soldAt: new Date(Date.parse(DEMO_AS_OF) - age * 86400000).toISOString(),
});

describe('exact evidence and reliable comparisons', () => {
  it.each([
    { releaseYear: 2024 },
    { rarity: 'Other' },
    { promo: true },
    { setName: 'Other set' },
  ])('isolates identity field %j', (change) => {
    expect(cardVariantKey({ ...demoCards[0], ...change })).not.toBe(
      cardVariantKey(demoCards[0]),
    );
  });
  it('preserves Unicode identities and exact numeric grades in search', () => {
    expect(cardVariantKey({ ...demoCards[0], name: '火' })).not.toBe(
      cardVariantKey({ ...demoCards[0], name: '水' }),
    );
    expect(
      matchesSearch(
        listing.identity,
        { kind: 'GRADED', company: 'PSA', grade: 10 },
        'PSA 1',
      ),
    ).toBe(false);
    expect(
      sameMarketTier(
        { kind: 'GRADED', company: 'BGS', grade: 9.5 },
        { kind: 'GRADED', company: 'BGS', grade: 9.54 },
      ),
    ).toBe(false);
  });
  it('retains distinct same-day same-price transactions and deduplicates repeated IDs', () => {
    const result = dedupeSales([sale(1), sale(2), { ...sale(1), id: 'alias' }]);
    expect(result.unique.map((item) => item.id)).toEqual(['test-1', 'test-2']);
    expect(result.duplicateGroups).toEqual([['test-1', 'alias']]);
  });
  it('does not collapse sales from different modes or providers', () => {
    const first = sale(1);
    expect(
      dedupeSales([
        first,
        { ...first, id: 'other', providerId: 'other' },
        {
          ...first,
          id: 'live',
          provenance: {
            ...first.provenance,
            dataMode: 'LIVE',
            synthetic: false,
          },
        },
      ]).unique,
    ).toHaveLength(3);
  });
  it('does not collapse listing URL paths with different case or different card years', () => {
    const first = {
      ...listing,
      tier: { kind: 'GRADED' as const, company: 'CGC' as const, grade: 10 },
      sourceUrl: 'https://demo.invalid/A',
    };
    const second = {
      ...first,
      id: 'second',
      externalId: 'second',
      sourceUrl: 'https://demo.invalid/a',
    };
    expect(
      dedupeListings([
        first,
        second,
        {
          ...first,
          id: 'different-year',
          identity: { ...first.identity, releaseYear: 2024 },
        },
      ]).unique,
    ).toHaveLength(3);
  });
  it('joins transitive listing aliases', () => {
    const base = {
      ...listing,
      tier: { kind: 'RAW' as const, condition: 'MINT' as const },
    };
    expect(
      dedupeListings([
        {
          ...base,
          id: 'a',
          externalId: 'a',
          sourceUrl: 'https://demo.invalid/a',
        },
        {
          ...base,
          id: 'b',
          externalId: 'b',
          sourceUrl: 'https://demo.invalid/b',
        },
        {
          ...base,
          id: 'c',
          externalId: 'b',
          sourceUrl: 'https://demo.invalid/a',
        },
      ]).unique,
    ).toHaveLength(1);
  });
  it('excludes future and invalid sale records, but retains the latest old sale', () => {
    const records = [
      sale(1, 10000, -1),
      { ...sale(2), soldAt: 'invalid' },
      sale(3, -20),
      sale(4, 10000, 100),
    ];
    const result = calculateMarketStatistics(listing, records, DEMO_AS_OF);
    expect(result.comparables.map((item) => item.id)).toEqual(['test-4']);
    expect(result.market.count90).toBe(0);
    expect(result.market.latestSale?.id).toBe('test-4');
    expect(result.market.median90).toBeUndefined();
  });
  it('cleans both windows even when the median absolute deviation is zero', () => {
    const records = [sale(1), sale(2), sale(3), sale(4), sale(5, 100000)];
    const { market } = calculateMarketStatistics(listing, records, DEMO_AS_OF);
    expect(market.anomalySaleIds).toEqual(['test-5']);
    expect(market.cleanedCount30).toBe(4);
    expect(market.cleanedCount90).toBe(4);
    expect(market.count90).toBe(5);
    expect(market.median30?.amountCents).toBe(10000);
    expect(market.liquidityScore).toBe(33);
  });
  it('withholds a 30-day median with fewer than three clean sales', () => {
    const { market } = calculateMarketStatistics(
      listing,
      [
        sale(1),
        sale(2),
        sale(3, 10000, 40),
        sale(4, 10000, 50),
        sale(5, 100000),
      ],
      DEMO_AS_OF,
    );
    expect(market.count30).toBe(3);
    expect(market.cleanedCount30).toBe(2);
    expect(market.median30).toBeUndefined();
    expect(market.median90?.amountCents).toBe(10000);
  });
  it('enforces raw/graded consistently across searches and deals', () => {
    const service = createDemoCardMarketService();
    const input = { query: '', rawOrGraded: 'RAW' as const, limit: 25 };
    const deals = service.findDeals(input).data;
    expect(deals.length).toBeGreaterThan(0);
    expect(deals.every((item) => item.listing.tier.kind === 'RAW')).toBe(true);
    expect(
      service
        .searchCards(input)
        .data.flatMap((item) => item.listingIds)
        .sort(),
    ).toEqual(deals.map((item) => item.listing.id).sort());
  });
  it('never selects a strongest listing when every overall score is withheld', () => {
    const service = new CardMarketService({ ...snapshot(), sales: [] });
    const result = service.compareListings([
      'listing-hf-1042',
      'listing-cc-8841',
    ]).data;
    expect(result.strongestListingId).toBeUndefined();
    expect(result.summary).toMatch(/withheld/);
  });
  it('rejects mixed seller provenance and ambiguous card resolution', () => {
    expect(
      () =>
        new CardMarketService({
          ...snapshot(),
          sellers: [
            {
              ...demoSellers[0],
              provenance: { ...demoSellers[0].provenance, dataMode: 'LIVE' },
            },
          ],
        }),
    ).toThrow(/isolation/);
    expect(() => createDemoCardMarketService().resolveCardId('')).toThrow(
      /Multiple card variants/,
    );
  });
  it('rejects out-of-range manual filters and contradictory tool filters', () => {
    const service = createDemoCardMarketService();
    expect(() =>
      service.searchCards({ query: '', minimumSellerTrust: 101 }),
    ).toThrow(/100/);
    const tools = createWebMcpTools(service);
    expect(() =>
      tools
        .find((item) => item.name === 'find_deals')!
        .execute({ raw_or_graded: 'RAW', grade: 10 }),
    ).toThrow(/Raw cards/);
    expect(() =>
      tools
        .find((item) => item.name === 'get_card_market_state')!
        .execute({ card_id: 'card-ember-dragon-ex', query: 'Ember' }),
    ).toThrow(/only one/);
  });
  it('waits for a late native API and does not register after cancellation', async () => {
    const target: WebMcpDocumentLike = {};
    const registered: string[] = [];
    const promise = registerScoutWebMcp(
      createDemoCardMarketService(),
      target,
      undefined,
      { waitForMs: 1000 },
    );
    target.modelContext = {
      registerTool: (tool) => {
        registered.push(tool.name);
      },
    };
    expect((await promise).count).toBe(6);
    const controller = new AbortController();
    controller.abort();
    await registerScoutWebMcp(
      createDemoCardMarketService(),
      target,
      undefined,
      { signal: controller.signal },
    );
    expect(registered).toHaveLength(6);
  });
});
