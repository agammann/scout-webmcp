import type {
  CardIdentity,
  MarketplaceListing,
  MarketTier,
  Provenance,
  Sale,
  Seller,
} from '@/src/domain/types';

export const DEMO_AS_OF = '2026-08-29T12:00:00.000Z';

export const demoCards: CardIdentity[] = [
  {
    id: 'card-ember-dragon-ex',
    name: 'Ember Dragon ex',
    setName: 'Obsidian Vault',
    setCode: 'OBV',
    cardNumber: '019/102',
    releaseYear: 2025,
    rarity: 'Special Illustration Rare',
    variant: 'Full Art',
    finish: 'SPECIAL',
    edition: 'STANDARD',
    language: 'ENGLISH',
    printing: 'First Print Wave',
    promo: false,
  },
  {
    id: 'card-volt-lynx',
    name: 'Volt Lynx',
    setName: 'Neon Frontier',
    setCode: 'NEF',
    cardNumber: '061/088',
    releaseYear: 2024,
    rarity: 'Illustration Rare',
    variant: 'Alternate Art',
    finish: 'SPECIAL',
    edition: 'STANDARD',
    language: 'ENGLISH',
    printing: 'Standard',
    promo: false,
  },
  {
    id: 'card-tide-oracle',
    name: 'Tide Oracle',
    setName: 'Crystal Current',
    setCode: 'CRC',
    cardNumber: '007/091',
    releaseYear: 2023,
    rarity: 'Ultra Rare',
    variant: 'Full Art',
    finish: 'HOLO',
    edition: 'STANDARD',
    language: 'ENGLISH',
    printing: 'Standard',
    promo: false,
  },
];

export const demoTiers = {
  emberCgc10: { kind: 'GRADED', company: 'CGC', grade: 10 } satisfies MarketTier,
  emberPsa10: { kind: 'GRADED', company: 'PSA', grade: 10 } satisfies MarketTier,
  emberPsa9: { kind: 'GRADED', company: 'PSA', grade: 9 } satisfies MarketTier,
  emberBgs95: { kind: 'GRADED', company: 'BGS', grade: 9.5 } satisfies MarketTier,
  emberRawNm: { kind: 'RAW', condition: 'NEAR_MINT' } satisfies MarketTier,
  voltPsa10: { kind: 'GRADED', company: 'PSA', grade: 10 } satisfies MarketTier,
  voltRawNm: { kind: 'RAW', condition: 'NEAR_MINT' } satisfies MarketTier,
  tideCgc95: { kind: 'GRADED', company: 'CGC', grade: 9.5 } satisfies MarketTier,
  tideRawLp: { kind: 'RAW', condition: 'LIGHTLY_PLAYED' } satisfies MarketTier,
};

const providerMeta = {
  'demo-holoforge': 'HoloForge Demo',
  'demo-collector-circuit': 'Collector Circuit Demo',
} as const;

export type DemoProviderId = keyof typeof providerMeta;

function provenance(providerId: DemoProviderId): Provenance {
  return {
    providerId,
    providerLabel: providerMeta[providerId],
    dataMode: 'SYNTHETIC',
    retrievedAt: DEMO_AS_OF,
    synthetic: true,
  };
}

export const demoSellers: Seller[] = [
  {
    id: 'seller-hf-northstar',
    providerId: 'demo-holoforge',
    platformSellerId: 'hf-2040',
    displayName: 'Northstar Cards (Demo)',
    feedbackPercent: 98.9,
    feedbackCount: 4821,
    transactionCount: 7300,
    accountAgeYears: 8,
    recentPositive: 314,
    recentNeutral: 3,
    recentNegative: 2,
    returnsAccepted: true,
    verified: true,
    relevantSalesCount: 31,
    listingQuality: 94,
    provenance: provenance('demo-holoforge'),
  },
  {
    id: 'seller-hf-signal',
    providerId: 'demo-holoforge',
    platformSellerId: 'hf-8201',
    displayName: 'Signal Slabs (Demo)',
    feedbackPercent: 99.4,
    feedbackCount: 920,
    transactionCount: 1450,
    accountAgeYears: 5,
    recentPositive: 126,
    recentNeutral: 1,
    recentNegative: 0,
    returnsAccepted: true,
    verified: true,
    relevantSalesCount: 68,
    listingQuality: 90,
    provenance: provenance('demo-holoforge'),
  },
  {
    id: 'seller-cc-harbor',
    providerId: 'demo-collector-circuit',
    platformSellerId: 'cc-1007',
    displayName: 'Harbor Collectibles (Demo)',
    feedbackPercent: 97.8,
    feedbackCount: 612,
    transactionCount: 940,
    accountAgeYears: 4,
    recentPositive: 87,
    recentNeutral: 4,
    recentNegative: 3,
    returnsAccepted: true,
    verified: false,
    relevantSalesCount: 42,
    listingQuality: 86,
    provenance: provenance('demo-collector-circuit'),
  },
  {
    id: 'seller-cc-new',
    providerId: 'demo-collector-circuit',
    platformSellerId: 'cc-9918',
    displayName: 'FreshPulls27 (Demo)',
    feedbackPercent: 100,
    feedbackCount: 4,
    transactionCount: 5,
    accountAgeYears: 0.2,
    recentPositive: 4,
    recentNeutral: 0,
    recentNegative: 0,
    returnsAccepted: false,
    verified: false,
    relevantSalesCount: 1,
    listingQuality: 52,
    provenance: provenance('demo-collector-circuit'),
  },
];

const listing = (
  providerId: DemoProviderId,
  id: string,
  identity: CardIdentity,
  tier: MarketTier,
  sellerId: string,
  price: number,
  shipping: number,
  details: Partial<MarketplaceListing> = {},
): MarketplaceListing => ({
  id,
  externalId: id.replace('listing-', ''),
  providerId,
  sourceUrl: `https://demo.invalid/${providerId}/${id}`,
  identity,
  tier,
  sellerId,
  title: `${identity.name} ${identity.setCode} ${identity.cardNumber} ${tier.kind === 'GRADED' ? `${tier.company} ${tier.grade}` : tier.condition}`,
  description: `Synthetic demonstration listing for ${identity.name}. Exact fictional card and condition shown.`,
  price: { amountCents: price, currency: 'USD' },
  shipping: { amountCents: shipping, currency: 'USD' },
  imageCount: 8,
  usesStockPhoto: false,
  returnsAccepted: true,
  listingType: 'BUY_NOW',
  observedAt: DEMO_AS_OF,
  provenance: provenance(providerId),
  ...details,
});

const [ember, volt, tide] = demoCards;

export const demoListings: MarketplaceListing[] = [
  listing('demo-holoforge', 'listing-hf-1042', ember, demoTiers.emberCgc10, 'seller-hf-northstar', 42100, 400),
  listing('demo-collector-circuit', 'listing-cc-8841', ember, demoTiers.emberCgc10, 'seller-cc-harbor', 43800, 0),
  listing('demo-holoforge', 'listing-hf-2055', ember, demoTiers.emberPsa10, 'seller-hf-signal', 51200, 0),
  listing('demo-collector-circuit', 'listing-cc-9077', ember, demoTiers.emberPsa9, 'seller-cc-harbor', 28600, 700),
  listing('demo-holoforge', 'listing-hf-1198', ember, demoTiers.emberBgs95, 'seller-hf-northstar', 34600, 650),
  listing('demo-collector-circuit', 'listing-cc-1104', ember, demoTiers.emberRawNm, 'seller-cc-new', 11800, 1800, {
    imageCount: 1,
    usesStockPhoto: true,
    returnsAccepted: false,
    title: 'Ember Dragon rare holo MINT? priced to move',
    description: 'Stock image. Exact variant not confirmed. No returns.',
  }),
  listing('demo-holoforge', 'listing-hf-7730', volt, demoTiers.voltPsa10, 'seller-hf-signal', 28400, 650),
  listing('demo-collector-circuit', 'listing-cc-5532', volt, demoTiers.voltRawNm, 'seller-cc-harbor', 8600, 500),
  listing('demo-holoforge', 'listing-hf-8820', tide, demoTiers.tideCgc95, 'seller-hf-northstar', 17400, 0),
  listing('demo-collector-circuit', 'listing-cc-8820-duplicate', tide, demoTiers.tideCgc95, 'seller-hf-northstar', 17400, 0, {
    externalId: 'hf-8820',
    sourceUrl: 'https://demo.invalid/demo-holoforge/listing-hf-8820',
  }),
  listing('demo-collector-circuit', 'listing-cc-4550', tide, demoTiers.tideRawLp, 'seller-cc-harbor', 4100, 550),
];

const saleSeries = (
  providerId: DemoProviderId,
  prefix: string,
  identity: CardIdentity,
  tier: MarketTier,
  cents: number[],
  dayOffsets: number[],
): Sale[] =>
  cents.map((price, index) => {
    const soldAt = new Date(DEMO_AS_OF);
    soldAt.setUTCDate(soldAt.getUTCDate() - dayOffsets[index]);
    return {
      id: `sale-${prefix}-${index + 1}`,
      externalId: `${prefix}-${index + 1}`,
      providerId,
      identity,
      tier,
      price: { amountCents: price, currency: 'USD' },
      shipping: { amountCents: index % 3 === 0 ? 500 : 0, currency: 'USD' },
      soldAt: soldAt.toISOString(),
      title: `${identity.name} ${tier.kind === 'GRADED' ? `${tier.company} ${tier.grade}` : tier.condition} sold comp`,
      provenance: provenance(providerId),
    };
  });

export const demoSales: Sale[] = [
  ...saleSeries('demo-holoforge', 'ember-cgc10', ember, demoTiers.emberCgc10, [47000, 46200, 47900, 45100, 46800, 48600, 45900, 47300, 45500, 49000, 44800, 92000], [4, 9, 15, 22, 28, 34, 41, 49, 58, 67, 76, 84]),
  ...saleSeries('demo-collector-circuit', 'ember-psa10', ember, demoTiers.emberPsa10, [54500, 53200, 55100, 52900, 56000, 53800, 54800, 52100, 55700, 53600], [3, 11, 18, 26, 35, 44, 52, 61, 72, 86]),
  ...saleSeries('demo-holoforge', 'ember-psa9', ember, demoTiers.emberPsa9, [30100, 29400, 30700, 28800, 29900, 31200, 29100, 30500], [6, 16, 25, 37, 48, 60, 73, 88]),
  ...saleSeries('demo-holoforge', 'ember-bgs95', ember, demoTiers.emberBgs95, [36200, 35500, 37100, 34900, 36500, 35800, 37400], [5, 14, 27, 39, 55, 69, 83]),
  ...saleSeries('demo-collector-circuit', 'ember-rawnm', ember, demoTiers.emberRawNm, [12800, 12100, 13200, 11900, 12500, 13600, 12300, 13000, 11800, 12700, 13400, 12400, 12900, 13100], [2, 7, 13, 19, 24, 31, 38, 45, 53, 61, 68, 75, 82, 89]),
  ...saleSeries('demo-holoforge', 'volt-psa10', volt, demoTiers.voltPsa10, [30100, 29600, 30900, 29200, 30500, 29800, 31200, 29400, 30700], [5, 12, 21, 29, 40, 51, 64, 77, 88]),
  ...saleSeries('demo-collector-circuit', 'volt-rawnm', volt, demoTiers.voltRawNm, [9100, 8800, 9400, 8650, 9200, 8950, 9550, 9000], [4, 15, 26, 37, 48, 61, 75, 87]),
  ...saleSeries('demo-holoforge', 'tide-cgc95', tide, demoTiers.tideCgc95, [18100, 17600, 18800, 17400, 18300, 17900], [8, 19, 33, 47, 66, 85]),
  ...saleSeries('demo-collector-circuit', 'tide-rawlp', tide, demoTiers.tideRawLp, [4600, 4400, 4900, 4200, 4700], [9, 27, 45, 64, 83]),
];

