import type { ScoreComponent, Seller, SellerTrustAssessment } from '@/src/domain/types';

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function wilsonLowerBound(positive: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const proportion = positive / total;
  const denominator = 1 + (z * z) / total;
  const centre = proportion + (z * z) / (2 * total);
  const margin =
    z * Math.sqrt((proportion * (1 - proportion) + (z * z) / (4 * total)) / total);
  return (centre - margin) / denominator;
}

export function assessSellerTrust(seller: Seller): SellerTrustAssessment {
  const recentTotal =
    seller.recentPositive !== undefined &&
    seller.recentNeutral !== undefined &&
    seller.recentNegative !== undefined
      ? seller.recentPositive + seller.recentNeutral + seller.recentNegative
      : undefined;

  const components: ScoreComponent[] = [
    {
      key: 'feedback',
      label: 'Feedback confidence',
      score:
        seller.feedbackPercent !== undefined && seller.feedbackCount !== undefined
          ? clamp(
              wilsonLowerBound(
                Math.round((seller.feedbackPercent / 100) * seller.feedbackCount),
                seller.feedbackCount,
              ) * 100,
            )
          : 0,
      weight: 35,
      explanation:
        seller.feedbackPercent !== undefined && seller.feedbackCount !== undefined
          ? `${seller.feedbackPercent}% across ${seller.feedbackCount.toLocaleString()} ratings, adjusted for sample size.`
          : 'Feedback evidence is unavailable.',
      available: seller.feedbackPercent !== undefined && seller.feedbackCount !== undefined,
    },
    {
      key: 'volume',
      label: 'Transaction volume',
      score: seller.transactionCount !== undefined ? clamp((Math.log10(seller.transactionCount + 1) / Math.log10(5001)) * 100) : 0,
      weight: 15,
      explanation:
        seller.transactionCount !== undefined
          ? `${seller.transactionCount.toLocaleString()} recorded transactions.`
          : 'Transaction count is unavailable.',
      available: seller.transactionCount !== undefined,
    },
    {
      key: 'recent',
      label: 'Recent rating mix',
      score:
        recentTotal !== undefined && recentTotal > 0
          ? clamp(100 - ((seller.recentNegative ?? 0) / recentTotal) * 550 - ((seller.recentNeutral ?? 0) / recentTotal) * 150)
          : 0,
      weight: 15,
      explanation:
        recentTotal !== undefined
          ? `${seller.recentNegative ?? 0} negative and ${seller.recentNeutral ?? 0} neutral ratings in the recent sample.`
          : 'Recent rating mix is unavailable.',
      available: recentTotal !== undefined,
    },
    {
      key: 'tenure',
      label: 'Account tenure',
      score: seller.accountAgeYears !== undefined ? clamp((seller.accountAgeYears / 8) * 100) : 0,
      weight: 10,
      explanation:
        seller.accountAgeYears !== undefined
          ? `${seller.accountAgeYears.toFixed(1)} years of platform history.`
          : 'Account age is unavailable.',
      available: seller.accountAgeYears !== undefined,
    },
    {
      key: 'policy',
      label: 'Returns and verification',
      score:
        seller.returnsAccepted !== undefined || seller.verified !== undefined
          ? (seller.returnsAccepted ? 55 : 0) + (seller.verified ? 45 : 0)
          : 0,
      weight: 10,
      explanation: `${seller.returnsAccepted ? 'Returns accepted' : 'Returns not accepted or unknown'}; ${seller.verified ? 'platform verification present' : 'no verification evidence'}.`,
      available: seller.returnsAccepted !== undefined || seller.verified !== undefined,
    },
    {
      key: 'relevance',
      label: 'Relevant selling history',
      score: seller.relevantSalesCount !== undefined ? clamp((seller.relevantSalesCount / 30) * 100) : 0,
      weight: 10,
      explanation:
        seller.relevantSalesCount !== undefined
          ? `${seller.relevantSalesCount} comparable collectible-card sales.`
          : 'Relevant category history is unavailable.',
      available: seller.relevantSalesCount !== undefined,
    },
    {
      key: 'listing',
      label: 'Listing consistency',
      score: seller.listingQuality ?? 0,
      weight: 5,
      explanation:
        seller.listingQuality !== undefined
          ? `Listing evidence quality scored ${seller.listingQuality}/100.`
          : 'Listing consistency is unavailable.',
      available: seller.listingQuality !== undefined,
    },
  ];

  const availableWeight = components
    .filter((component) => component.available)
    .reduce((sum, component) => sum + component.weight, 0);
  const coverage = availableWeight / 100;
  const weighted = components
    .filter((component) => component.available)
    .reduce((sum, component) => sum + component.score * component.weight, 0);
  const score = coverage >= 0.55 ? Math.round(weighted / availableWeight) : null;
  const warnings: string[] = [];
  if ((seller.feedbackCount ?? 0) < 20) warnings.push('Very limited feedback history.');
  if ((seller.recentNegative ?? 0) >= 3) warnings.push('Multiple recent negative ratings.');
  if (seller.returnsAccepted === false) warnings.push('Returns are not accepted.');
  if ((seller.accountAgeYears ?? 99) < 1) warnings.push('Account is less than one year old.');

  return {
    sellerId: seller.id,
    score,
    coverage: Math.round(coverage * 100),
    label:
      score === null
        ? 'WITHHELD'
        : coverage >= 0.9 && (seller.feedbackCount ?? 0) >= 500
          ? 'HIGH_CONFIDENCE'
          : coverage >= 0.7
            ? 'ESTABLISHED'
            : 'LIMITED',
    components,
    warnings,
    methodologyVersion: 'seller-trust-v1.0',
  };
}

