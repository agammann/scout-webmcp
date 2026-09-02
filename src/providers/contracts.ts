import type {
  CardIdentity,
  DataMode,
  MarketplaceListing,
  ProviderStatus,
  Sale,
  Seller,
} from '@/src/domain/types';

export interface CatalogProvider {
  readonly status: ProviderStatus;
  searchCatalog(query: string): Promise<CardIdentity[]> | CardIdentity[];
  getCard(cardId: string): Promise<CardIdentity | undefined> | CardIdentity | undefined;
}

export interface MarketplaceProvider {
  readonly status: ProviderStatus;
  getListings(): Promise<MarketplaceListing[]> | MarketplaceListing[];
  getListing(listingId: string): Promise<MarketplaceListing | undefined> | MarketplaceListing | undefined;
}

export interface SalesHistoryProvider {
  readonly status: ProviderStatus;
  getSales(): Promise<Sale[]> | Sale[];
}

export interface SellerProvider {
  readonly status: ProviderStatus;
  getSellers(): Promise<Seller[]> | Seller[];
  getSeller(sellerId: string): Promise<Seller | undefined> | Seller | undefined;
}

export interface ScoutProvider
  extends CatalogProvider,
    MarketplaceProvider,
    SalesHistoryProvider,
    SellerProvider {
  readonly dataMode: DataMode;
}

export class ProviderUnavailableError extends Error {
  constructor(providerId: string, reason: string) {
    super(`${providerId} is unavailable: ${reason}`);
    this.name = 'ProviderUnavailableError';
  }
}
