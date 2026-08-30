import { exactMarketKey } from '@/src/domain/identity';
import type { MarketplaceListing, Sale } from '@/src/domain/types';

export interface DedupeResult<T> {
  unique: T[];
  duplicateGroups: string[][];
}

export function dedupeListings(listings: MarketplaceListing[]): DedupeResult<MarketplaceListing> {
  const seen = new Map<string, MarketplaceListing>();
  const groups = new Map<string, string[]>();

  for (const listing of listings) {
    const keys = [
      `external:${listing.providerId}:${listing.externalId}`,
      listing.sourceUrl ? `url:${listing.sourceUrl.toLowerCase()}` : undefined,
      listing.tier.kind === 'GRADED' && listing.tier.certificationNumber
        ? `cert:${listing.tier.company}:${listing.tier.certificationNumber}`
        : undefined,
    ].filter((key): key is string => Boolean(key));

    const existingKey = keys.find((key) => seen.has(key));
    if (existingKey) {
      const existing = seen.get(existingKey)!;
      const groupKey = `group:${existing.id}`;
      const group = groups.get(groupKey) ?? [existing.id];
      group.push(listing.id);
      groups.set(groupKey, group);
      continue;
    }
    for (const key of keys) seen.set(key, listing);
  }

  const duplicateIds = new Set([...groups.values()].flatMap((group) => group.slice(1)));
  const unique = listings.filter((listing) => !duplicateIds.has(listing.id));
  return { unique, duplicateGroups: [...groups.values()] };
}

export function dedupeSales(sales: Sale[]): DedupeResult<Sale> {
  const seen = new Map<string, Sale>();
  const groups = new Map<string, string[]>();
  const unique: Sale[] = [];

  for (const sale of sales) {
    const exact = `external:${sale.providerId}:${sale.externalId}`;
    const fallback = [
      exactMarketKey(sale.identity, sale.tier),
      sale.soldAt.slice(0, 10),
      sale.price.currency,
      sale.price.amountCents,
      sale.shipping?.amountCents ?? 0,
      sale.sourceUrl ?? '',
    ].join('|');
    const key = seen.has(exact) ? exact : fallback;
    const existing = seen.get(key);
    if (existing) {
      const groupKey = `group:${existing.id}`;
      groups.set(groupKey, [...(groups.get(groupKey) ?? [existing.id]), sale.id]);
      continue;
    }
    seen.set(exact, sale);
    seen.set(fallback, sale);
    unique.push(sale);
  }
  return { unique, duplicateGroups: [...groups.values()] };
}

