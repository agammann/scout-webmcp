import type { ProviderStatus } from '@/src/domain/types';

export interface EbayProviderEnvironment {
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  EBAY_MARKETPLACE_ID?: string;
}

export const ebayProviderStatus: ProviderStatus = {
  id: 'ebay',
  label: 'eBay',
  dataMode: 'LIVE',
  enabled: false,
  synthetic: false,
  capabilities: {
    catalog: false,
    currentListings: true,
    individualSales: false,
    sellers: true,
    sellerReviews: false,
    population: false,
  },
  limitation:
    'Disabled in Phase 1. Production Browse API access, OAuth credentials, display rights, and a server-side runtime are required. Sold history is a separate restricted capability.',
};

export function validateEbayEnvironment(environment: EbayProviderEnvironment): string[] {
  const missing: string[] = [];
  if (!environment.EBAY_CLIENT_ID) missing.push('EBAY_CLIENT_ID');
  if (!environment.EBAY_CLIENT_SECRET) missing.push('EBAY_CLIENT_SECRET');
  if (!environment.EBAY_MARKETPLACE_ID) missing.push('EBAY_MARKETPLACE_ID');
  return missing;
}

