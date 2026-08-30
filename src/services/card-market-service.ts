import { matchesSearch, marketTierKey, sameCardVariant, sameMarketTier } from '@/src/domain/identity';
import type {
  CardIdentity,
  ComparisonResult,
  ListingAssessment,
  MarketplaceListing,
  MarketTier,
  ProviderStatus,
  RawVsGradedResult,
  ResponseEnvelope,
  Sale,
  SearchInput,
  SearchResult,
  Seller,
} from '@/src/domain/types';
import { assessDeal } from '@/src/engine/deal-score';
import { dedupeListings } from '@/src/engine/dedupe';
import { assessListingRisks } from '@/src/engine/listing-risks';
import { calculateMarketStatistics } from '@/src/engine/market-statistics';
import { assessSellerTrust } from '@/src/engine/seller-trust';
import { createDemoProviders } from '@/src/providers/demo/demo-provider';
import { DEMO_AS_OF, demoCards, demoListings, demoSales, demoSellers } from '@/src/providers/demo/data';

const LIMITATIONS = [
  'All displayed marketplace, seller, listing, and sale records are fictional synthetic demo data.',
  'Synthetic and live records are not combined.',
  'Scores are decision-support signals, not authenticity guarantees, investment advice, or profit forecasts.',
  'Taxes are excluded; acquisition cost includes only item price and known shipping.',
];

export interface ProviderSnapshot {
  cards: CardIdentity[];
  listings: MarketplaceListing[];
  sales: Sale[];
  sellers: Seller[];
  statuses: ProviderStatus[];
  asOf: string;
}

export class CardMarketService {
  private readonly uniqueListings: MarketplaceListing[];
  private readonly sellerById: Map<string, Seller>;
  readonly duplicateListingGroups: string[][];

  constructor(private readonly snapshot: ProviderSnapshot) {
    if (snapshot.statuses.some((status) => status.dataMode !== 'SYNTHETIC')) {
      throw new Error('Phase 1 CardMarketService accepts only SYNTHETIC provider snapshots.');
    }
    if (
      [...snapshot.listings, ...snapshot.sales].some(
        (record) => record.provenance.dataMode !== 'SYNTHETIC' || !record.provenance.synthetic,
      )
    ) {
      throw new Error('Synthetic/live data isolation invariant failed.');
    }
    const deduped = dedupeListings(snapshot.listings);
    this.uniqueListings = deduped.unique;
    this.duplicateListingGroups = deduped.duplicateGroups;
    this.sellerById = new Map(snapshot.sellers.map((seller) => [seller.id, seller]));
  }

  providerStatuses(): ProviderStatus[] {
    return this.snapshot.statuses.map((status) => ({ ...status }));
  }

  allListings(): MarketplaceListing[] {
    return [...this.uniqueListings];
  }

  private envelope<T>(data: T, uiState: ResponseEnvelope<T>['uiState']): ResponseEnvelope<T> {
    return {
      dataMode: 'SYNTHETIC',
      synthetic: true,
      asOf: this.snapshot.asOf,
      sourceProviders: this.providerStatuses(),
      methodologyVersion: 'cardscout-phase1-v1.0',
      limitations: LIMITATIONS,
      uiState,
      data,
    };
  }

  private assessmentFor(listing: MarketplaceListing): ListingAssessment {
    const seller = this.sellerById.get(listing.sellerId);
    if (!seller) throw new Error(`Seller not found for listing ${listing.id}.`);
    const sellerTrust = assessSellerTrust(seller);
    const { market, comparables } = calculateMarketStatistics(
      listing,
      this.snapshot.sales,
      this.snapshot.asOf,
    );
    const deal = assessDeal(listing, market, seller, sellerTrust);
    const risks = assessListingRisks(listing, market, seller, sellerTrust);
    return { listing, seller, sellerTrust, market, deal, risks, comparableSales: comparables };
  }

  assessListing(listingId: string): ResponseEnvelope<ListingAssessment> {
    const listing = this.uniqueListings.find((item) => item.id === listingId);
    if (!listing) throw new Error(`Listing ${listingId} was not found.`);
    return this.envelope(this.assessmentFor(listing), {
      route: `/#listing=${encodeURIComponent(listingId)}`,
      selectedCardId: listing.identity.id,
      selectedListingIds: [listingId],
      activeView: 'listing',
    });
  }

  searchCards(input: SearchInput): ResponseEnvelope<SearchResult[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 12, 25));
    const assessments = this.uniqueListings
      .filter((listing) => matchesSearch(listing.identity, listing.tier, input.query))
      .map((listing) => this.assessmentFor(listing))
      .filter((assessment) => {
        const { listing, sellerTrust, deal } = assessment;
        if (input.maxTotalCents !== undefined && deal.totalAcquisition.amountCents > input.maxTotalCents) return false;
        if (input.rawOrGraded && listing.tier.kind !== input.rawOrGraded) return false;
        if (
          input.gradingCompany &&
          (listing.tier.kind !== 'GRADED' || listing.tier.company !== input.gradingCompany)
        )
          return false;
        if (input.grade !== undefined && (listing.tier.kind !== 'GRADED' || listing.tier.grade !== input.grade)) return false;
        if (
          input.minimumSellerTrust !== undefined &&
          (sellerTrust.score === null || sellerTrust.score < input.minimumSellerTrust)
        )
          return false;
        if (
          input.minimumPercentBelowMarket !== undefined &&
          (deal.percentFromMedian90 === undefined || deal.percentFromMedian90 > -input.minimumPercentBelowMarket)
        )
          return false;
        return true;
      });

    const grouped = new Map<string, ListingAssessment[]>();
    for (const assessment of assessments) {
      const id = assessment.listing.identity.id;
      grouped.set(id, [...(grouped.get(id) ?? []), assessment]);
    }

    const results = [...grouped.entries()]
      .map(([cardId, cardAssessments]): SearchResult => {
        const sorted = cardAssessments.sort(
          (left, right) =>
            (right.deal.score ?? right.deal.marketDealScore ?? -1) -
            (left.deal.score ?? left.deal.marketDealScore ?? -1),
        );
        const tierMap = new Map(sorted.map((item) => [marketTierKey(item.listing.tier), item.listing.tier]));
        return {
          card: this.snapshot.cards.find((card) => card.id === cardId) ?? sorted[0].listing.identity,
          tiers: [...tierMap.values()],
          listingCount: sorted.length,
          bestListing: sorted[0],
        };
      })
      .sort(
        (left, right) =>
          (right.bestListing?.deal.score ?? right.bestListing?.deal.marketDealScore ?? -1) -
          (left.bestListing?.deal.score ?? left.bestListing?.deal.marketDealScore ?? -1),
      )
      .slice(0, limit);

    return this.envelope(results, {
      route: `/#search=${encodeURIComponent(input.query)}`,
      query: input.query,
      selectedCardId: results[0]?.card.id,
      activeView: 'search',
    });
  }

  getCardMarketState(cardId: string): ResponseEnvelope<{ card: CardIdentity; assessments: ListingAssessment[] }> {
    const card = this.snapshot.cards.find((item) => item.id === cardId);
    if (!card) throw new Error(`Card ${cardId} was not found.`);
    const assessments = this.uniqueListings
      .filter((listing) => sameCardVariant(listing.identity, card))
      .map((listing) => this.assessmentFor(listing))
      .sort(
        (left, right) =>
          (right.deal.score ?? right.deal.marketDealScore ?? -1) -
          (left.deal.score ?? left.deal.marketDealScore ?? -1),
      );
    return this.envelope({ card, assessments }, {
      route: `/#card=${encodeURIComponent(cardId)}`,
      selectedCardId: cardId,
      activeView: 'card',
    });
  }

  compareListings(listingIds: string[]): ResponseEnvelope<ComparisonResult> {
    const uniqueIds = [...new Set(listingIds)];
    if (uniqueIds.length < 2 || uniqueIds.length > 5) {
      throw new Error('Compare requires between 2 and 5 unique listing IDs.');
    }
    const assessments = uniqueIds.map((id) => this.assessListing(id).data);
    const sorted = [...assessments].sort(
      (left, right) =>
        (right.deal.score ?? right.deal.marketDealScore ?? -1) -
        (left.deal.score ?? left.deal.marketDealScore ?? -1),
    );
    const strongest = sorted[0];
    const result: ComparisonResult = {
      assessments,
      strongestListingId: strongest?.listing.id,
      summary: strongest
        ? `${strongest.listing.title} has the strongest evidence-adjusted score among the selected listings.`
        : 'No comparable listing was available.',
    };
    return this.envelope(result, {
      route: `/#compare=${uniqueIds.map(encodeURIComponent).join(',')}`,
      selectedCardId: strongest?.listing.identity.id,
      selectedListingIds: uniqueIds,
      activeView: 'compare',
    });
  }

  findDeals(input: SearchInput): ResponseEnvelope<ListingAssessment[]> {
    const query = input.query.trim();
    const assessments = this.uniqueListings
      .filter((listing) => (query ? matchesSearch(listing.identity, listing.tier, query) : true))
      .map((listing) => this.assessmentFor(listing))
      .filter((assessment) => {
        if (input.maxTotalCents !== undefined && assessment.deal.totalAcquisition.amountCents > input.maxTotalCents)
          return false;
        if (
          input.minimumSellerTrust !== undefined &&
          (assessment.sellerTrust.score === null || assessment.sellerTrust.score < input.minimumSellerTrust)
        )
          return false;
        if (
          input.minimumPercentBelowMarket !== undefined &&
          (assessment.deal.percentFromMedian90 === undefined ||
            assessment.deal.percentFromMedian90 > -input.minimumPercentBelowMarket)
        )
          return false;
        if (
          input.gradingCompany &&
          (assessment.listing.tier.kind !== 'GRADED' ||
            assessment.listing.tier.company !== input.gradingCompany)
        )
          return false;
        if (
          input.grade !== undefined &&
          (assessment.listing.tier.kind !== 'GRADED' || assessment.listing.tier.grade !== input.grade)
        )
          return false;
        return true;
      })
      .sort(
        (left, right) =>
          (right.deal.score ?? right.deal.marketDealScore ?? -1) -
          (left.deal.score ?? left.deal.marketDealScore ?? -1),
      )
      .slice(0, Math.max(1, Math.min(input.limit ?? 10, 25)));

    return this.envelope(assessments, {
      route: `/#deals=${encodeURIComponent(query)}`,
      query,
      selectedCardId: assessments[0]?.listing.identity.id,
      selectedListingIds: assessments.map((assessment) => assessment.listing.id),
      activeView: 'deals',
    });
  }

  compareRawVsGraded(cardId: string): ResponseEnvelope<RawVsGradedResult> {
    const card = this.snapshot.cards.find((item) => item.id === cardId);
    if (!card) throw new Error(`Card ${cardId} was not found.`);
    const relevant = this.uniqueListings.filter((listing) => sameCardVariant(listing.identity, card));
    const uniqueByTier = new Map<string, MarketplaceListing>();
    for (const listing of relevant) {
      uniqueByTier.set(marketTierKey(listing.tier), listing);
    }
    const raw: RawVsGradedResult['raw'] = [];
    const graded: RawVsGradedResult['graded'] = [];
    for (const listing of uniqueByTier.values()) {
      const { market } = calculateMarketStatistics(listing, this.snapshot.sales, this.snapshot.asOf);
      if (listing.tier.kind === 'RAW') raw.push({ tier: listing.tier, market });
      else graded.push({ tier: listing.tier, market });
    }
    const result: RawVsGradedResult = {
      card,
      raw,
      graded: graded.sort((left, right) => right.tier.grade - left.tier.grade),
      note: 'Raw and graded tiers are shown side by side and are never pooled into one market estimate.',
    };
    return this.envelope(result, {
      route: `/#raw-vs-graded=${encodeURIComponent(cardId)}`,
      selectedCardId: cardId,
      activeView: 'raw-vs-graded',
    });
  }

  resolveCardId(query: string): string | undefined {
    return this.snapshot.cards.find((card) =>
      this.uniqueListings.some(
        (listing) => listing.identity.id === card.id && matchesSearch(card, listing.tier, query),
      ),
    )?.id;
  }

  findTier(cardId: string, target: MarketTier): MarketplaceListing | undefined {
    return this.uniqueListings.find(
      (listing) => listing.identity.id === cardId && sameMarketTier(listing.tier, target),
    );
  }
}

export function createDemoCardMarketService(): CardMarketService {
  const statuses = createDemoProviders().map((provider) => provider.status);
  return new CardMarketService({
    cards: demoCards,
    listings: demoListings,
    sales: demoSales,
    sellers: demoSellers,
    statuses,
    asOf: DEMO_AS_OF,
  });
}

export const cardMarketService = createDemoCardMarketService();

