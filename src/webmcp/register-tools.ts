import type { GradingCompany, ResponseEnvelope, SearchInput } from '@/src/domain/types';
import type { CardMarketService } from '@/src/services/card-market-service';

export interface WebMcpToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: true; untrustedContentHint: true };
  execute: (input: unknown) => unknown;
}

export interface ModelContextLike {
  registerTool: (
    definition: WebMcpToolDefinition,
    options?: { signal?: AbortSignal },
  ) => unknown;
}

export interface WebMcpDocumentLike {
  modelContext?: ModelContextLike;
}

type ToolResultHandler = (toolName: string, result: unknown) => void;

const searchProperties = {
  query: { type: 'string', maxLength: 160, description: 'Card name, set, number, grade, or condition.' },
  max_total_cents: {
    type: 'integer',
    minimum: 1,
    maximum: 10_000_000,
    description: 'Maximum item price plus known shipping, expressed as integer USD cents.',
  },
  raw_or_graded: {
    type: 'string',
    enum: ['RAW', 'GRADED'],
    description: 'Restrict results to raw cards or professionally graded cards.',
  },
  grading_company: {
    type: 'string',
    enum: ['PSA', 'BGS', 'CGC'],
    description: 'Exact grading company. Different grading companies are never pooled.',
  },
  grade: {
    type: 'number',
    minimum: 1,
    maximum: 10,
    description: 'Exact numeric grade from 1 to 10. Adjacent grades are never pooled.',
  },
  minimum_seller_trust: {
    type: 'number',
    minimum: 0,
    maximum: 100,
    description: 'Minimum evidence-backed Seller Trust score from 0 to 100.',
  },
  minimum_percent_below_market: {
    type: 'number',
    minimum: 0,
    maximum: 95,
    description: 'Minimum percentage below the exact-tier 90-day median.',
  },
  limit: {
    type: 'integer',
    minimum: 1,
    maximum: 25,
    description: 'Maximum number of normalized results to return.',
  },
};

function objectInput(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Tool input must be an object.');
  }
  return value as Record<string, unknown>;
}

function stringField(input: Record<string, unknown>, key: string, required = false): string | undefined {
  const value = input[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 160) {
    throw new Error(`${key} must be a non-empty string of at most 160 characters.`);
  }
  return value.trim();
}

function numberField(
  input: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): number | undefined {
  const value = input[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${key} must be a number from ${minimum} to ${maximum}.`);
  }
  return value;
}

function integerField(
  input: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): number | undefined {
  const value = numberField(input, key, minimum, maximum);
  if (value !== undefined && !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer.`);
  }
  return value;
}

function parseSearchInput(value: unknown, queryRequired = true): SearchInput {
  const input = objectInput(value);
  const allowed = new Set(Object.keys(searchProperties));
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`Unknown input field: ${unknown[0]}.`);
  const query = stringField(input, 'query', queryRequired) ?? '';
  const rawOrGraded = input.raw_or_graded;
  if (rawOrGraded !== undefined && rawOrGraded !== 'RAW' && rawOrGraded !== 'GRADED') {
    throw new Error('raw_or_graded must be RAW or GRADED.');
  }
  const gradingCompany = input.grading_company;
  if (
    gradingCompany !== undefined &&
    gradingCompany !== 'PSA' &&
    gradingCompany !== 'BGS' &&
    gradingCompany !== 'CGC'
  ) {
    throw new Error('grading_company must be PSA, BGS, or CGC.');
  }
  return {
    query,
    maxTotalCents: integerField(input, 'max_total_cents', 1, 10_000_000),
    rawOrGraded,
    gradingCompany: gradingCompany as GradingCompany | undefined,
    grade: numberField(input, 'grade', 1, 10),
    minimumSellerTrust: numberField(input, 'minimum_seller_trust', 0, 100),
    minimumPercentBelowMarket: numberField(input, 'minimum_percent_below_market', 0, 95),
    limit: integerField(input, 'limit', 1, 25),
  };
}

function resolveCard(service: CardMarketService, value: unknown): string {
  const input = objectInput(value);
  const unknown = Object.keys(input).filter((key) => key !== 'card_id' && key !== 'query');
  if (unknown.length) throw new Error(`Unknown input field: ${unknown[0]}.`);
  const cardId = stringField(input, 'card_id');
  const query = stringField(input, 'query');
  if (!cardId && !query) throw new Error('Provide card_id or query.');
  const resolved = cardId ?? service.resolveCardId(query!);
  if (!resolved) throw new Error(`No normalized card matched "${query}".`);
  return resolved;
}

function emit<T>(handler: ToolResultHandler | undefined, name: string, result: T): T {
  handler?.(name, result);
  return result;
}

export function createWebMcpTools(
  service: CardMarketService,
  onResult?: ToolResultHandler,
): WebMcpToolDefinition[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: true } as const;
  return [
    {
      name: 'search_cards',
      title: 'Search cards',
      description: 'Search normalized card variants and return the strongest exact-tier listing for each card.',
      inputSchema: {
        type: 'object',
        properties: searchProperties,
        required: ['query'],
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: (input) => emit(onResult, 'search_cards', service.searchCards(parseSearchInput(input))),
    },
    {
      name: 'get_card_market_state',
      title: 'Get card market state',
      description:
        'Get current listings, exact comparable-sales statistics, scores, and risks for one normalized card. Provide either card_id or query.',
      inputSchema: {
        type: 'object',
        properties: {
          card_id: {
            type: 'string',
            maxLength: 160,
            description: 'Canonical Scout card identifier. Use this when a previous result supplied it.',
          },
          query: {
            type: 'string',
            maxLength: 160,
            description: 'Card name, set, number, grade, or condition used to resolve one canonical card.',
          },
        },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: (input) => {
        const cardId = resolveCard(service, input);
        return emit(onResult, 'get_card_market_state', service.getCardMarketState(cardId));
      },
    },
    {
      name: 'assess_listing',
      title: 'Assess listing',
      description: 'Assess one listing using total cost, exact comps, Deal Score, Seller Trust, and warning evidence.',
      inputSchema: {
        type: 'object',
        properties: {
          listing_id: {
            type: 'string',
            maxLength: 160,
            description: 'Scout listing identifier returned by search_cards or get_card_market_state.',
          },
        },
        required: ['listing_id'],
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: (value) => {
        const input = objectInput(value);
        const unknown = Object.keys(input).filter((key) => key !== 'listing_id');
        if (unknown.length) throw new Error(`Unknown input field: ${unknown[0]}.`);
        const id = stringField(input, 'listing_id', true)!;
        return emit(onResult, 'assess_listing', service.assessListing(id));
      },
    },
    {
      name: 'compare_listings',
      title: 'Compare listings',
      description: 'Compare two to five listings using aligned acquisition cost, market, trust, risk, and score evidence.',
      inputSchema: {
        type: 'object',
        properties: {
          listing_ids: {
            type: 'array',
            description: 'Two to five unique Scout listing identifiers from prior search or market-state results.',
            items: {
              type: 'string',
              maxLength: 160,
              description: 'A Scout listing identifier.',
            },
            minItems: 2,
            maxItems: 5,
            uniqueItems: true,
          },
        },
        required: ['listing_ids'],
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: (value) => {
        const input = objectInput(value);
        const unknown = Object.keys(input).filter((key) => key !== 'listing_ids');
        if (unknown.length) throw new Error(`Unknown input field: ${unknown[0]}.`);
        if (!Array.isArray(input.listing_ids) || input.listing_ids.length < 2 || input.listing_ids.length > 5) {
          throw new Error('listing_ids must contain between 2 and 5 IDs.');
        }
        const ids = input.listing_ids.map((item) => {
          if (typeof item !== 'string' || !item.trim()) throw new Error('Each listing ID must be a string.');
          return item.trim();
        });
        return emit(onResult, 'compare_listings', service.compareListings(ids));
      },
    },
    {
      name: 'find_deals',
      title: 'Find deals',
      description: 'Find listings that satisfy a budget, exact grade, seller-trust, and below-market threshold.',
      inputSchema: {
        type: 'object',
        properties: searchProperties,
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: (input) => emit(onResult, 'find_deals', service.findDeals(parseSearchInput(input, false))),
    },
    {
      name: 'compare_raw_vs_graded',
      title: 'Compare raw versus graded',
      description:
        'Compare raw-condition and company-and-grade-specific market tiers without pooling them. Provide either card_id or query.',
      inputSchema: {
        type: 'object',
        properties: {
          card_id: {
            type: 'string',
            maxLength: 160,
            description: 'Canonical Scout card identifier. Use this when a previous result supplied it.',
          },
          query: {
            type: 'string',
            maxLength: 160,
            description: 'Card name, set, or number used to resolve one canonical card.',
          },
        },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: (input) => {
        const cardId = resolveCard(service, input);
        return emit(onResult, 'compare_raw_vs_graded', service.compareRawVsGraded(cardId));
      },
    },
  ];
}

export async function registerScoutWebMcp(
  service: CardMarketService,
  target: WebMcpDocumentLike,
  onResult?: ToolResultHandler,
  options: { signal?: AbortSignal } = {},
): Promise<{ supported: boolean; count: number }> {
  const register = target.modelContext?.registerTool;
  if (typeof register !== 'function') return { supported: false, count: 0 };
  const tools = createWebMcpTools(service, onResult);
  for (const tool of tools) {
    await register.call(target.modelContext, tool, options);
  }
  return { supported: true, count: tools.length };
}

export function isSyntheticEnvelope(value: unknown): value is ResponseEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dataMode' in value &&
    value.dataMode === 'SYNTHETIC' &&
    'synthetic' in value &&
    value.synthetic === true
  );
}
