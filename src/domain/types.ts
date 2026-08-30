export type DataMode = 'LIVE' | 'SANDBOX' | 'SYNTHETIC';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD';
export type Language = 'ENGLISH' | 'JAPANESE' | 'GERMAN' | 'FRENCH' | 'SPANISH' | 'ITALIAN';
export type Finish = 'NON_HOLO' | 'HOLO' | 'REVERSE_HOLO' | 'SPECIAL';
export type Edition = 'FIRST_EDITION' | 'UNLIMITED' | 'SHADOWLESS' | 'PROMO' | 'STANDARD';
export type RawCondition = 'MINT' | 'NEAR_MINT' | 'LIGHTLY_PLAYED' | 'MODERATELY_PLAYED' | 'HEAVILY_PLAYED' | 'DAMAGED';
export type GradingCompany = 'PSA' | 'BGS' | 'CGC';
export type ConfidenceLabel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface Money {
  amountCents: number;
  currency: Currency;
}

export interface CardIdentity {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  cardNumber: string;
  releaseYear: number;
  rarity: string;
  variant: string;
  finish: Finish;
  edition: Edition;
  language: Language;
  printing: string;
  promo: boolean;
}

export interface RawTier {
  kind: 'RAW';
  condition: RawCondition;
}

export interface GradedTier {
  kind: 'GRADED';
  company: GradingCompany;
  grade: number;
  certificationNumber?: string;
  subgrades?: Record<string, number>;
}

export type MarketTier = RawTier | GradedTier;

export interface Provenance {
  providerId: string;
  providerLabel: string;
  dataMode: DataMode;
  retrievedAt: string;
  synthetic: boolean;
}

export interface Seller {
  id: string;
  providerId: string;
  platformSellerId: string;
  displayName: string;
  feedbackPercent?: number;
  feedbackCount?: number;
  transactionCount?: number;
  accountAgeYears?: number;
  recentPositive?: number;
  recentNeutral?: number;
  recentNegative?: number;
  returnsAccepted?: boolean;
  verified?: boolean;
  relevantSalesCount?: number;
  listingQuality?: number;
  provenance: Provenance;
}

export interface MarketplaceListing {
  id: string;
  externalId: string;
  providerId: string;
  sourceUrl?: string;
  identity: CardIdentity;
  tier: MarketTier;
  sellerId: string;
  title: string;
  description: string;
  price: Money;
  shipping?: Money;
  imageCount: number;
  usesStockPhoto?: boolean;
  returnsAccepted?: boolean;
  listingType: 'BUY_NOW' | 'AUCTION';
  endsAt?: string;
  observedAt: string;
  provenance: Provenance;
}

export interface Sale {
  id: string;
  externalId: string;
  providerId: string;
  identity: CardIdentity;
  tier: MarketTier;
  price: Money;
  shipping?: Money;
  soldAt: string;
  title: string;
  sourceUrl?: string;
  provenance: Provenance;
}

export interface ProviderCapabilities {
  catalog: boolean;
  currentListings: boolean;
  individualSales: boolean;
  sellers: boolean;
  sellerReviews: boolean;
  population: boolean;
}

export interface ProviderStatus {
  id: string;
  label: string;
  dataMode: DataMode;
  enabled: boolean;
  synthetic: boolean;
  capabilities: ProviderCapabilities;
  limitation?: string;
}

export interface MatchExplanation {
  exact: boolean;
  score: number;
  reasons: string[];
  exclusions: string[];
}

export interface MarketStatistics {
  currency: Currency;
  latestSale?: Sale;
  median30?: Money;
  median90?: Money;
  weightedMedian90?: Money;
  count30: number;
  count90: number;
  low90?: Money;
  high90?: Money;
  cleanedLow90?: Money;
  cleanedHigh90?: Money;
  anomalySaleIds: string[];
  liquidityScore: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  asOf: string;
}

export interface ScoreComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  explanation: string;
  available: boolean;
}

export interface SellerTrustAssessment {
  sellerId: string;
  score: number | null;
  coverage: number;
  label: 'WITHHELD' | 'LIMITED' | 'ESTABLISHED' | 'HIGH_CONFIDENCE';
  components: ScoreComponent[];
  warnings: string[];
  methodologyVersion: string;
}

export interface ListingRisk {
  code: string;
  label: string;
  severity: RiskSeverity;
  evidence: string;
}

export interface DealAssessment {
  listingId: string;
  score: number | null;
  marketDealScore: number | null;
  classification:
    | 'EXCEPTIONAL_DEAL'
    | 'STRONG_BUY'
    | 'GOOD_PRICE'
    | 'FAIR_PRICE'
    | 'SLIGHTLY_EXPENSIVE'
    | 'OVERPRICED'
    | 'WITHHELD';
  totalAcquisition: Money;
  differenceFromLatest?: Money;
  percentFromLatest?: number;
  differenceFromMedian90?: Money;
  percentFromMedian90?: number;
  components: ScoreComponent[];
  reasons: string[];
  methodologyVersion: string;
}

export interface ListingAssessment {
  listing: MarketplaceListing;
  seller: Seller;
  sellerTrust: SellerTrustAssessment;
  market: MarketStatistics;
  deal: DealAssessment;
  risks: ListingRisk[];
  comparableSales: Sale[];
}

export interface ResponseEnvelope<T> {
  dataMode: DataMode;
  synthetic: boolean;
  asOf: string;
  sourceProviders: ProviderStatus[];
  methodologyVersion: string;
  limitations: string[];
  uiState: {
    route: string;
    query?: string;
    selectedCardId?: string;
    selectedListingIds?: string[];
    activeView?: string;
  };
  data: T;
}

export interface SearchInput {
  query: string;
  maxTotalCents?: number;
  rawOrGraded?: 'RAW' | 'GRADED';
  gradingCompany?: GradingCompany;
  grade?: number;
  minimumSellerTrust?: number;
  minimumPercentBelowMarket?: number;
  limit?: number;
}

export interface SearchResult {
  card: CardIdentity;
  tiers: MarketTier[];
  listingCount: number;
  bestListing?: ListingAssessment;
}

export interface ComparisonResult {
  assessments: ListingAssessment[];
  strongestListingId?: string;
  summary: string;
}

export interface RawVsGradedResult {
  card: CardIdentity;
  raw: Array<{ tier: RawTier; market: MarketStatistics }>;
  graded: Array<{ tier: GradedTier; market: MarketStatistics }>;
  note: string;
}

