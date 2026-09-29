import { exactMarketKey } from '@/src/domain/identity';
import type { MarketplaceListing, Sale } from '@/src/domain/types';

export interface DedupeResult<T> {
  unique: T[];
  duplicateGroups: string[][];
}

// Connected components preserve aliases even when a later record links two groups.
function dedupe<T extends { id: string }>(
  records: T[],
  keysFor: (record: T) => string[],
): DedupeResult<T> {
  const parents = records.map((_, index) => index);
  const root = (index: number): number =>
    parents[index] === index ? index : (parents[index] = root(parents[index]));
  const seen = new Map<string, number>();
  records.forEach((record, index) => {
    for (const key of keysFor(record)) {
      const previous = seen.get(key);
      if (previous !== undefined) {
        const a = root(index);
        const b = root(previous);
        parents[Math.max(a, b)] = Math.min(a, b);
      }
      seen.set(key, index);
    }
  });
  const groups = new Map<number, T[]>();
  records.forEach((record, index) => {
    const key = root(index);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });
  return {
    unique: [...groups.values()].map((group) => group[0]),
    duplicateGroups: [...groups.values()]
      .filter((group) => group.length > 1)
      .map((group) => group.map((record) => record.id)),
  };
}

export function dedupeListings(
  listings: MarketplaceListing[],
): DedupeResult<MarketplaceListing> {
  return dedupe(listings, (listing) => {
    const scope = `${listing.provenance.dataMode}:${exactMarketKey(listing.identity, listing.tier)}:${listing.price.currency}`;
    return [
      `${scope}:external:${listing.providerId}:${listing.externalId}`,
      // URL paths are case-sensitive. Never lowercase a complete source URL.
      ...(listing.sourceUrl ? [`${scope}:url:${listing.sourceUrl}`] : []),
      ...(listing.tier.kind === 'GRADED' && listing.tier.certificationNumber
        ? [
            `${scope}:cert:${listing.tier.company}:${listing.tier.certificationNumber}`,
          ]
        : []),
    ];
  });
}

export function dedupeSales(sales: Sale[]): DedupeResult<Sale> {
  // Same price/day/certification does not establish the same transaction.
  // A listing URL can be reused for multiple sales; use the provider transaction ID.
  return dedupe(sales, (sale) => [
    `${sale.provenance.dataMode}:${sale.providerId}:${sale.externalId}:${exactMarketKey(sale.identity, sale.tier)}:${sale.price.currency}`,
  ]);
}
