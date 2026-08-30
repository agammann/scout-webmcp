import type {
  DealAssessment,
  MarketplaceListing,
  MarketStatistics,
  ScoreComponent,
  Seller,
  SellerTrustAssessment,
} from '@/src/domain/types';

import { addMoney, subtractMoney } from './money';

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const logisticPriceScore = (discountRatio: number) => 100 / (1 + Math.exp(-10 * discountRatio));

function classify(score: number | null): DealAssessment['classification'] {
  if (score === null) return 'WITHHELD';
  if (score >= 90) return 'EXCEPTIONAL_DEAL';
  if (score >= 80) return 'STRONG_BUY';
  if (score >= 70) return 'GOOD_PRICE';
  if (score >= 55) return 'FAIR_PRICE';
  if (score >= 40) return 'SLIGHTLY_EXPENSIVE';
  return 'OVERPRICED';
}

export function assessDeal(
  listing: MarketplaceListing,
  market: MarketStatistics,
  seller: Seller,
  sellerTrust: SellerTrustAssessment,
): DealAssessment {
  const total = addMoney(listing.price, listing.shipping);
  const median90 = market.median90;
  const latestTotal = market.latestSale
    ? addMoney(market.latestSale.price, market.latestSale.shipping)
    : undefined;
  const discountRatio = median90 ? (median90.amountCents - total.amountCents) / median90.amountCents : undefined;
  const priceScore = discountRatio === undefined ? 0 : clamp(logisticPriceScore(discountRatio));
  const listingQuality = clamp(
    Math.min(50, listing.imageCount * 8) +
      (listing.description.length >= 60 ? 20 : 8) +
      (listing.returnsAccepted ? 20 : 0) +
      (listing.usesStockPhoto ? 0 : 10),
  );
  const components: ScoreComponent[] = [
    {
      key: 'price',
      label: 'Price vs exact market',
      score: priceScore,
      weight: 40,
      explanation:
        discountRatio === undefined
          ? 'No reliable 90-day exact-match median is available.'
          : `${Math.abs(discountRatio * 100).toFixed(1)}% ${discountRatio >= 0 ? 'below' : 'above'} the 90-day median after known shipping.`,
      available: discountRatio !== undefined,
    },
    {
      key: 'comps',
      label: 'Comparable-sale quality',
      score: market.confidenceScore,
      weight: 20,
      explanation: `${market.count90} exact sales; ${market.confidenceLabel.toLowerCase()} confidence.`,
      available: market.count90 >= 3,
    },
    {
      key: 'seller',
      label: 'Seller trust',
      score: sellerTrust.score ?? 0,
      weight: 20,
      explanation:
        sellerTrust.score === null
          ? `Seller evidence coverage is only ${sellerTrust.coverage}%; overall score withheld.`
          : `Seller Trust is ${sellerTrust.score}/100 with ${sellerTrust.coverage}% evidence coverage.`,
      available: sellerTrust.score !== null,
    },
    {
      key: 'listing',
      label: 'Listing quality',
      score: listingQuality,
      weight: 10,
      explanation: `${listing.imageCount} images, ${listing.usesStockPhoto ? 'stock-photo evidence' : 'item-photo evidence'}, and ${listing.returnsAccepted ? 'returns accepted' : 'no returns'}.`,
      available: true,
    },
    {
      key: 'liquidity',
      label: 'Market liquidity',
      score: market.liquidityScore,
      weight: 10,
      explanation: `${market.count90} exact sales in the 90-day window.`,
      available: true,
    },
  ];

  const marketComponents = components.filter((component) => component.key !== 'seller' && component.available);
  const marketWeight = marketComponents.reduce((sum, component) => sum + component.weight, 0);
  const marketDealScore = median90
    ? Math.round(
        marketComponents.reduce((sum, component) => sum + component.score * component.weight, 0) /
          marketWeight,
      )
    : null;
  const score =
    median90 && sellerTrust.score !== null
      ? Math.round(components.reduce((sum, component) => sum + component.score * component.weight, 0) / 100)
      : null;
  const reasons = components.map((component) => component.explanation);
  if (score !== null && seller.recentNegative !== undefined && seller.recentNegative > 0) {
    reasons.push(`${seller.recentNegative} recent negative seller ratings remain visible as risk evidence.`);
  }

  return {
    listingId: listing.id,
    score,
    marketDealScore,
    classification: classify(score),
    totalAcquisition: total,
    differenceFromLatest: latestTotal ? subtractMoney(total, latestTotal) : undefined,
    percentFromLatest: latestTotal
      ? ((total.amountCents - latestTotal.amountCents) / latestTotal.amountCents) * 100
      : undefined,
    differenceFromMedian90: median90 ? subtractMoney(total, median90) : undefined,
    percentFromMedian90: median90
      ? ((total.amountCents - median90.amountCents) / median90.amountCents) * 100
      : undefined,
    components,
    reasons,
    methodologyVersion: 'deal-score-v1.0',
  };
}

export function priceScoreForDiscount(percentBelow: number): number {
  return Math.round(clamp(logisticPriceScore(percentBelow / 100)));
}

export function scoreLabel(score: number | null): string {
  return classify(score)
    .toLowerCase()
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

