import { describe, expect, it } from 'vitest';

import { cardVariantKey, exactMarketKey, sameCardVariant, sameMarketTier } from '@/src/domain/identity';
import { demoCards, demoTiers } from '@/src/providers/demo/data';

describe('canonical card identity', () => {
  it('keeps grader, grade, raw condition, and raw/graded tiers separate', () => {
    expect(sameMarketTier(demoTiers.emberPsa10, demoTiers.emberPsa9)).toBe(false);
    expect(sameMarketTier(demoTiers.emberPsa10, demoTiers.emberCgc10)).toBe(false);
    expect(sameMarketTier(demoTiers.emberPsa10, demoTiers.emberBgs95)).toBe(false);
    expect(sameMarketTier(demoTiers.emberPsa10, demoTiers.emberRawNm)).toBe(false);
  });

  it('changes the variant key when language or printing changes', () => {
    const card = demoCards[0];
    const japanese = { ...card, language: 'JAPANESE' as const };
    const reprint = { ...card, printing: 'Second Print Wave' };
    expect(sameCardVariant(card, japanese)).toBe(false);
    expect(sameCardVariant(card, reprint)).toBe(false);
    expect(cardVariantKey(card)).not.toBe(cardVariantKey(japanese));
  });

  it('builds deterministic exact-market keys', () => {
    expect(exactMarketKey(demoCards[0], demoTiers.emberPsa10)).toBe(
      exactMarketKey({ ...demoCards[0] }, { ...demoTiers.emberPsa10 }),
    );
  });
});

