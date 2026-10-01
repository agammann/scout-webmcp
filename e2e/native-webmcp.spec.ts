import { test, expect, type Page } from '@playwright/test';

type NativeTool = {
  name: string;
  inputSchema: string | Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  origin: string;
};
type NativeContext = {
  getTools: () => Promise<NativeTool[]>;
  executeTool: (
    tool: NativeTool,
    input: string | Record<string, unknown>,
  ) => Promise<unknown>;
};
const names = [
  'assess_listing',
  'compare_listings',
  'compare_raw_vs_graded',
  'find_deals',
  'get_card_market_state',
  'search_cards',
];
const errors = new WeakMap<Page, string[]>();
async function call(page: Page, name: string, input: Record<string, unknown>) {
  return page.evaluate(
    async ({ name, input }) => {
      const native = document.modelContext as unknown as NativeContext;
      const tool = (await native.getTools()).find((tool) => tool.name === name);
      if (!tool) throw new Error(`Native discovery did not return ${name}`);
      const major = Number(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
      try {
        const result = await native.executeTool(
          tool,
          major < 155 ? JSON.stringify(input) : input,
        );
        return (
          typeof result === 'string' ? JSON.parse(result) : result
        ) as Record<string, unknown>;
      } catch (error) {
        return { nativeError: (error as Error).message };
      }
    },
    { name, input },
  );
}
test.beforeEach(async ({ page, browser }, testInfo) => {
  const entries: string[] = [];
  errors.set(page, entries);
  page.on('pageerror', (error) => entries.push(error.message));
  await testInfo.attach('browser-version', {
    body: browser.version(),
    contentType: 'text/plain',
  });
  await page.goto('/');
  await expect(
    page.getByRole('status').filter({ hasText: '6 agent tools ready' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.modelContext?.registerTool.toString()),
  ).toContain('[native code]');
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

test('native discovery and all six tools preserve synthetic provenance and update the workspace', async ({
  page,
}) => {
  const tools = await page.evaluate(async () =>
    (await (document.modelContext as unknown as NativeContext).getTools()).map(
      ({ name, inputSchema, annotations, origin }) => ({
        name,
        inputSchema,
        annotations,
        origin,
      }),
    ),
  );
  expect(tools.map((tool) => tool.name)).toEqual(names);
  for (const tool of tools) {
    expect(
      typeof tool.inputSchema === 'string'
        ? JSON.parse(tool.inputSchema)
        : tool.inputSchema,
    ).toMatchObject({ type: 'object', additionalProperties: false });
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
    expect(tool.origin).toBe(new URL(page.url()).origin);
  }
  expect(
    await call(page, 'search_cards', {
      query: 'Volt Lynx',
      raw_or_graded: 'RAW',
    }),
  ).toMatchObject({
    dataMode: 'SYNTHETIC',
    synthetic: true,
    data: [{ card: { id: 'card-volt-lynx' } }],
  });
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await expect(page.getByTestId('listing-card')).toContainText('Raw');
  expect(
    await call(page, 'find_deals', {
      query: 'Ember Dragon ex',
      raw_or_graded: 'GRADED',
      grading_company: 'CGC',
      grade: 10,
      max_total_cents: 50000,
      minimum_seller_trust: 90,
      minimum_percent_below_market: 5,
    }),
  ).toMatchObject({
    dataMode: 'SYNTHETIC',
    asOf: '2026-08-29T12:00:00.000Z',
    data: [
      {
        listing: { id: 'listing-hf-1042' },
        deal: { totalAcquisition: { amountCents: 42500 } },
      },
    ],
  });
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await expect(page.getByTestId('applied-filters')).toContainText(
    'CGC · grade 10',
  );
  expect(
    await call(page, 'get_card_market_state', {
      card_id: 'card-ember-dragon-ex',
    }),
  ).toMatchObject({
    dataMode: 'SYNTHETIC',
    data: { card: { id: 'card-ember-dragon-ex' } },
  });
  await expect(page.getByTestId('listing-card')).toHaveCount(6);
  expect(
    await call(page, 'assess_listing', { listing_id: 'listing-hf-1042' }),
  ).toMatchObject({
    dataMode: 'SYNTHETIC',
    data: { listing: { id: 'listing-hf-1042' } },
  });
  await expect(page.getByText('$425.00').first()).toBeVisible();
  expect(
    await call(page, 'compare_listings', {
      listing_ids: ['listing-hf-1042', 'listing-cc-8841'],
    }),
  ).toMatchObject({
    dataMode: 'SYNTHETIC',
    data: {
      assessments: [
        { listing: { id: 'listing-hf-1042' } },
        { listing: { id: 'listing-cc-8841' } },
      ],
    },
  });
  await expect(
    page.getByRole('heading', { name: 'Compare 2 listings' }),
  ).toBeVisible();
  expect(
    await call(page, 'compare_raw_vs_graded', {
      card_id: 'card-ember-dragon-ex',
    }),
  ).toMatchObject({
    dataMode: 'SYNTHETIC',
    data: { card: { id: 'card-ember-dragon-ex' } },
  });
  await expect(
    page.getByRole('heading', {
      name: 'Raw versus graded, without false equivalence',
    }),
  ).toBeVisible();
  expect(
    await call(page, 'search_cards', { query: 'no such card' }),
  ).toMatchObject({ dataMode: 'SYNTHETIC', data: [] });
  await expect(page.getByTestId('listing-card')).toHaveCount(0);
});

test('invalid native calls including duplicate comparison IDs leave the workspace unchanged', async ({
  page,
}) => {
  const before = await page.getByTestId('listing-card').allTextContents();
  const filters = await page.getByTestId('applied-filters').innerText();
  const invalid: [string, Record<string, unknown>][] = [
    ...names.map(
      (name) => [name, { unknown: true }] as [string, Record<string, unknown>],
    ),
    ['search_cards', { query: 'Ember Dragon', limit: 2.5 }],
    ['find_deals', { minimum_seller_trust: 101 }],
    ['find_deals', { raw_or_graded: 'RAW', grading_company: 'PSA' }],
    [
      'get_card_market_state',
      { card_id: 'card-ember-dragon-ex', query: 'Ember Dragon' },
    ],
    ['assess_listing', { listing_id: 'missing' }],
    ['compare_listings', { listing_ids: ['listing-hf-1042'] }],
    [
      'compare_listings',
      {
        listing_ids: [
          'listing-hf-1042',
          'listing-cc-8841',
          ' listing-hf-1042 ',
        ],
      },
    ],
  ];
  for (const [name, input] of invalid) {
    const result = await call(page, name, input);
    expect(
      result.nativeError,
      `${name}: ${JSON.stringify(input)}`,
    ).toBeTruthy();
    expect(await page.getByTestId('listing-card').allTextContents()).toEqual(
      before,
    );
    await expect(page.getByTestId('applied-filters')).toHaveText(filters);
  }
});

test('native tools clean up, recover after back navigation, and reset on reload', async ({
  page,
}, testInfo) => {
  await call(page, 'search_cards', {
    query: 'Volt Lynx',
    raw_or_graded: 'RAW',
  });
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide')),
  );
  expect(
    await page.evaluate(
      async () =>
        (await (document.modelContext as unknown as NativeContext).getTools())
          .length,
    ),
  ).toBe(0);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await expect(
    page.getByRole('status').filter({ hasText: '6 agent tools ready' }),
  ).toBeVisible();
  await page.evaluate(() => {
    const events: boolean[] = [];
    Object.assign(window, { scoutNativePageShows: events });
    window.addEventListener('pageshow', (event) =>
      events.push(event.persisted),
    );
  });
  await page.goto('/llms.txt');
  await page.goBack({ waitUntil: 'commit' });
  await expect(
    page.getByRole('status').filter({ hasText: '6 agent tools ready' }),
  ).toBeVisible();
  const restored = await page.evaluate(
    () =>
      (
        window as Window & { scoutNativePageShows?: boolean[] }
      ).scoutNativePageShows?.includes(true) ?? false,
  );
  await testInfo.attach('navigation-restoration', {
    body: JSON.stringify({ backForwardCacheRestored: restored }),
    contentType: 'application/json',
  });
  if (!process.env.SCOUT_WEBMCP_URL) expect(restored).toBe(true);
  if (restored) await expect(page.getByTestId('listing-card')).toHaveCount(1);
  expect(
    await call(page, 'search_cards', { query: 'Volt Lynx' }),
  ).toMatchObject({ dataMode: 'SYNTHETIC' });
  await page.reload();
  await expect(
    page.getByRole('status').filter({ hasText: '6 agent tools ready' }),
  ).toBeVisible();
  await expect(page.getByTestId('search-input')).toHaveValue('Ember Dragon ex');
  await expect(page.getByTestId('listing-card')).toHaveCount(6);
});
