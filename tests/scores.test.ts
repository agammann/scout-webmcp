import { describe, expect, it } from 'vitest';

import type { Seller } from '@/src/domain/types';
import { priceScoreForDiscount } from '@/src/engine/deal-score';
import { assessSellerTrust } from '@/src/engine/seller-trust';
import { demoSellers } from '@/src/providers/demo/data';

describe('evidence-based scores', () => {
  it('rewards a discount without allowing an unbounded price component', () => {
    expect(priceScoreForDiscount(15)).toBeGreaterThan(priceScoreForDiscount(0));
    expect(priceScoreForDiscount(100)).toBeLessThanOrEqual(100);
    expect(priceScoreForDiscount(-30)).toBeGreaterThanOrEqual(0);
  });

  it('uses sample-adjusted seller evidence', () => {
    const established = assessSellerTrust(demoSellers[0]);
    const tinySample = assessSellerTrust(demoSellers[3]);
    expect(established.score).not.toBeNull();
    expect(established.score!).toBeGreaterThan(tinySample.score ?? 0);
    expect(tinySample.warnings).toContain('Very limited feedback history.');
  });

  it('withholds Seller Trust below the evidence coverage threshold', () => {
    const incomplete: Seller = {
      id: 'seller-incomplete',
      providerId: 'demo-holoforge',
      platformSellerId: 'incomplete',
      displayName: 'Incomplete Demo Seller',
      feedbackPercent: 100,
      feedbackCount: 3,
      provenance: demoSellers[0].provenance,
    };
    const result = assessSellerTrust(incomplete);
    expect(result.coverage).toBe(35);
    expect(result.score).toBeNull();
    expect(result.label).toBe('WITHHELD');
  });
});

