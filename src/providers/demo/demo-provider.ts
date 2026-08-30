import { matchesSearch } from '@/src/domain/identity';
import type { CardIdentity, MarketplaceListing, ProviderStatus, Sale, Seller } from '@/src/domain/types';
import type { CardScoutProvider } from '@/src/providers/contracts';

import {
  demoCards,
  demoListings,
  demoSales,
  demoSellers,
  type DemoProviderId,
} from './data';

const labels: Record<DemoProviderId, string> = {
  'demo-holoforge': 'HoloForge Demo',
  'demo-collector-circuit': 'Collector Circuit Demo',
};

export class DemoMarketplaceProvider implements CardScoutProvider {
  readonly dataMode = 'SYNTHETIC' as const;
  readonly status: ProviderStatus;

  constructor(readonly id: DemoProviderId) {
    this.status = {
      id,
      label: labels[id],
      dataMode: 'SYNTHETIC',
      enabled: true,
      synthetic: true,
      capabilities: {
        catalog: true,
        currentListings: true,
        individualSales: true,
        sellers: true,
        sellerReviews: false,
        population: false,
      },
      limitation: 'Fictional records created only to demonstrate CardScout behavior.',
    };
  }

  searchCatalog(query: string): CardIdentity[] {
    const listings = this.getListings();
    const matchingIds = new Set(
      listings
        .filter((item) => matchesSearch(item.identity, item.tier, query))
        .map((item) => item.identity.id),
    );
    return demoCards.filter((card) => matchingIds.has(card.id));
  }

  getCard(cardId: string): CardIdentity | undefined {
    return demoCards.find((card) => card.id === cardId);
  }

  getListings(): MarketplaceListing[] {
    return demoListings.filter((item) => item.providerId === this.id);
  }

  getListing(listingId: string): MarketplaceListing | undefined {
    return this.getListings().find((item) => item.id === listingId);
  }

  getSales(): Sale[] {
    return demoSales.filter((item) => item.providerId === this.id);
  }

  getSellers(): Seller[] {
    return demoSellers.filter((item) => item.providerId === this.id);
  }

  getSeller(sellerId: string): Seller | undefined {
    return this.getSellers().find((item) => item.id === sellerId);
  }
}

export function createDemoProviders(): DemoMarketplaceProvider[] {
  return [
    new DemoMarketplaceProvider('demo-holoforge'),
    new DemoMarketplaceProvider('demo-collector-circuit'),
  ];
}

