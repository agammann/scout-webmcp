import { describe, expect, it, vi } from 'vitest';

import { createDemoCardMarketService } from '@/src/services/card-market-service';
import { createWebMcpTools, registerScoutWebMcp, type WebMcpToolDefinition } from '@/src/webmcp/register-tools';

describe('WebMCP tools', () => {
  it('registers six read-only, strict tools', async () => {
    const definitions: WebMcpToolDefinition[] = [];
    const result = await registerScoutWebMcp(createDemoCardMarketService(), {
      modelContext: {
        registerTool: (definition) => definitions.push(definition),
      },
    });
    expect(result).toEqual({ supported: true, count: 6 });
    expect(definitions).toHaveLength(6);
    expect(definitions.every((tool) => tool.annotations.readOnlyHint)).toBe(true);
    expect(definitions.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true);
  });

  it('returns provenance, limitations, and UI state from a search', async () => {
    const onResult = vi.fn();
    const tool = createWebMcpTools(createDemoCardMarketService(), onResult).find(
      (candidate) => candidate.name === 'search_cards',
    )!;
    const result = (await tool.execute({ query: 'Ember Dragon ex', limit: 5 })) as Record<string, unknown>;
    expect(result.dataMode).toBe('SYNTHETIC');
    expect(result.synthetic).toBe(true);
    expect(Array.isArray(result.limitations)).toBe(true);
    expect((result.uiState as { activeView: string }).activeView).toBe('search');
    expect(onResult).toHaveBeenCalledOnce();
  });

  it('rejects unknown fields, fractional integer fields, and invalid comparisons', async () => {
    const tools = createWebMcpTools(createDemoCardMarketService());
    const search = tools.find((tool) => tool.name === 'search_cards')!;
    const compare = tools.find((tool) => tool.name === 'compare_listings')!;
    expect(() => search.execute({ query: 'Ember Dragon', surprise: true })).toThrow(/Unknown input field/);
    expect(() => search.execute({ query: 'Ember Dragon', limit: 2.5 })).toThrow(/integer/);
    expect(() => compare.execute({ listing_ids: ['listing-hf-1042'] })).toThrow(/between 2 and 5/);
  });

  it('feature-detects browsers without WebMCP support', async () => {
    await expect(registerScoutWebMcp(createDemoCardMarketService(), {})).resolves.toEqual({
      supported: false,
      count: 0,
    });
  });
});
