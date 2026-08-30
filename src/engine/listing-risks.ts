import type {
  ListingRisk,
  MarketplaceListing,
  MarketStatistics,
  Seller,
  SellerTrustAssessment,
} from '@/src/domain/types';

export function assessListingRisks(
  listing: MarketplaceListing,
  market: MarketStatistics,
  seller: Seller,
  sellerTrust: SellerTrustAssessment,
): ListingRisk[] {
  const risks: ListingRisk[] = [];
  const total = listing.price.amountCents + (listing.shipping?.amountCents ?? 0);
  if (market.median90 && total < market.median90.amountCents * 0.7) {
    risks.push({
      code: 'PRICE_FAR_BELOW_MARKET',
      label: 'Price unusually below market',
      severity: 'HIGH',
      evidence: 'Known acquisition cost is more than 30% below the exact 90-day median.',
    });
  }
  if (listing.usesStockPhoto) {
    risks.push({
      code: 'STOCK_PHOTO',
      label: 'Stock-photo evidence only',
      severity: 'MEDIUM',
      evidence: 'The provider record indicates a stock image rather than item-specific photos.',
    });
  }
  if (listing.imageCount < 3) {
    risks.push({
      code: 'SPARSE_PHOTOS',
      label: 'Insufficient photos',
      severity: 'MEDIUM',
      evidence: `Only ${listing.imageCount} listing image is available.`,
    });
  }
  if (sellerTrust.score === null || sellerTrust.score < 60) {
    risks.push({
      code: 'LIMITED_SELLER_EVIDENCE',
      label: 'Limited seller history',
      severity: sellerTrust.score === null ? 'HIGH' : 'MEDIUM',
      evidence: `Seller Trust ${sellerTrust.score === null ? 'is withheld' : `is ${sellerTrust.score}/100`} with ${sellerTrust.coverage}% evidence coverage.`,
    });
  }
  if ((seller.recentNegative ?? 0) >= 3) {
    risks.push({
      code: 'RECENT_NEGATIVES',
      label: 'Recent negative seller feedback',
      severity: 'MEDIUM',
      evidence: `${seller.recentNegative} recent negative ratings are present in the synthetic evidence.`,
    });
  }
  if (!listing.returnsAccepted) {
    risks.push({
      code: 'NO_RETURNS',
      label: 'No returns',
      severity: 'MEDIUM',
      evidence: 'The listing does not accept returns.',
    });
  }
  const shipping = listing.shipping?.amountCents ?? 0;
  if (shipping >= 1500 || shipping > listing.price.amountCents * 0.15) {
    risks.push({
      code: 'HIGH_SHIPPING',
      label: 'Unusually high shipping',
      severity: 'MEDIUM',
      evidence: `Shipping is ${(shipping / 100).toFixed(2)} ${listing.price.currency}.`,
    });
  }
  if (market.count90 < 3) {
    risks.push({
      code: 'INSUFFICIENT_COMPS',
      label: 'Insufficient comparable sales',
      severity: 'HIGH',
      evidence: `Only ${market.count90} exact sales are available in the 90-day window.`,
    });
  }
  const normalizedTitle = listing.title.toLowerCase();
  if (
    !normalizedTitle.includes(listing.identity.setCode.toLowerCase()) ||
    !normalizedTitle.includes(listing.identity.cardNumber.toLowerCase())
  ) {
    risks.push({
      code: 'IDENTITY_AMBIGUITY',
      label: 'Possible wrong card or variant',
      severity: 'HIGH',
      evidence: 'The listing title omits the canonical set code or card number.',
    });
  }
  if (listing.tier.kind === 'GRADED' && !listing.tier.certificationNumber) {
    risks.push({
      code: 'CERT_NOT_PROVIDED',
      label: 'Certification number not provided',
      severity: 'LOW',
      evidence: 'Grade-specific comparison is available, but no certification number was supplied.',
    });
  }
  if (listing.description.toLowerCase().includes('variant not confirmed')) {
    risks.push({
      code: 'DESCRIPTION_CONFLICT',
      label: 'Description conflicts with normalized identity',
      severity: 'HIGH',
      evidence: 'The description says the exact variant is not confirmed.',
    });
  }
  if (risks.length === 0) {
    risks.push({
      code: 'NO_AUTOMATED_ALERTS',
      label: 'No automated warning triggered',
      severity: 'INFO',
      evidence: 'Automated checks found no configured alert. This is not an authenticity guarantee.',
    });
  }
  return risks;
}

