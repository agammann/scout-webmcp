import type { CardIdentity, GradedTier, MarketTier, RawTier } from './types';

const normalizeToken = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

export function cardVariantKey(card: CardIdentity): string {
  return [
    card.name,
    card.setCode,
    card.cardNumber,
    card.variant,
    card.finish,
    card.edition,
    card.language,
    card.printing,
  ]
    .map((value) => normalizeToken(String(value)))
    .join(':');
}

export function marketTierKey(tier: MarketTier): string {
  if (tier.kind === 'RAW') {
    return `raw:${normalizeToken(tier.condition)}`;
  }
  return `graded:${tier.company.toLowerCase()}:${tier.grade.toFixed(1)}`;
}

export function exactMarketKey(card: CardIdentity, tier: MarketTier): string {
  return `${cardVariantKey(card)}::${marketTierKey(tier)}`;
}

export function sameCardVariant(left: CardIdentity, right: CardIdentity): boolean {
  return cardVariantKey(left) === cardVariantKey(right);
}

export function sameMarketTier(left: MarketTier, right: MarketTier): boolean {
  return marketTierKey(left) === marketTierKey(right);
}

export function isGradedTier(tier: MarketTier): tier is GradedTier {
  return tier.kind === 'GRADED';
}

export function isRawTier(tier: MarketTier): tier is RawTier {
  return tier.kind === 'RAW';
}

export function tokenizeSearch(query: string): string[] {
  return query
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function searchableIdentity(card: CardIdentity, tier?: MarketTier): string {
  const values = [
    card.name,
    card.setName,
    card.setCode,
    card.cardNumber,
    String(card.releaseYear),
    card.rarity,
    card.variant,
    card.finish.replaceAll('_', ' '),
    card.edition.replaceAll('_', ' '),
    card.language,
    card.printing,
  ];
  if (tier?.kind === 'RAW') values.push('raw', tier.condition.replaceAll('_', ' '));
  if (tier?.kind === 'GRADED') values.push('graded', tier.company, String(tier.grade));
  return values.join(' ').toLowerCase();
}

export function matchesSearch(card: CardIdentity, tier: MarketTier, query: string): boolean {
  const haystack = searchableIdentity(card, tier);
  return tokenizeSearch(query).every((token) => haystack.includes(token));
}

