import { test, expect, type Page } from '@playwright/test';
import type { WebMcpToolDefinition } from '../src/webmcp/register-tools';

type Harness = Window & { scoutTools: Record<string, WebMcpToolDefinition> };
async function mockTools(page: Page, fail = false) {
  await page.addInitScript((fail) => {
    const tools: Record<string, WebMcpToolDefinition> = {};
    (window as unknown as Harness).scoutTools = tools;
    Object.defineProperty(document, 'modelContext', {
      value: {
        registerTool(
          tool: WebMcpToolDefinition,
          options: { signal: AbortSignal },
        ) {
          if (fail && tool.name === 'assess_listing')
            throw new Error('Test registration failure');
          tools[tool.name] = tool;
          options.signal.addEventListener(
            'abort',
            () => {
              if (tools[tool.name] === tool) delete tools[tool.name];
            },
            { once: true },
          );
        },
      },
      configurable: true,
    });
  }, fail);
}
async function call(page: Page, name: string, input: unknown) {
  return page.evaluate(
    ({ name, input }) =>
      (window as unknown as Harness).scoutTools[name].execute(input),
    { name, input },
  );
}

test('filtered search only shows matching listings and empty search clears old evidence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  await page.getByTestId('search-submit').click();
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await expect(page.getByTestId('listing-card')).toContainText('Raw');
  await page.getByRole('button', { name: 'All tiers', exact: true }).click();
  await page.getByTestId('search-input').fill('Volt Lynx PSA 10');
  await page.getByLabel('Max total $').fill('500');
  await page.getByTestId('search-submit').click();
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await expect(page.getByTestId('listing-card')).toContainText('PSA 10');
  await page.getByTestId('search-input').fill('unknown card');
  await page.getByTestId('search-submit').click();
  await expect(page.getByTestId('listing-card')).toHaveCount(0);
  await expect(page.getByText('Selected listing', { exact: true })).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
});

test('comparison supports five selections, removal, and inspectable score evidence', async ({
  page,
}) => {
  await page.goto('/');
  const cards = page.getByTestId('listing-card');
  await expect(cards).toHaveCount(6);
  for (let i = 0; i < 5; i++)
    await cards
      .nth(i)
      .getByRole('button', { name: 'Compare', exact: true })
      .click();
  await expect(
    cards.nth(5).getByRole('button', { name: 'Compare', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Compare 5', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Compare 5 listings' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /^Remove listing-/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Compare 4 listings' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add more listings' }).click();
  await page.getByText('Score breakdown and seller evidence').click();
  await expect(page.getByText(/Price vs exact market:/)).toBeVisible();
});

test('all six tool contracts update visible state without turning deal searches into comparisons', async ({
  page,
}) => {
  await mockTools(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('6 agent tools ready');
  const search = (await call(page, 'search_cards', {
    query: 'Volt Lynx',
    raw_or_graded: 'RAW',
  })) as { data: { card: { id: string } }[] };
  expect(search.data[0].card.id).toBe('card-volt-lynx');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await call(page, 'find_deals', { raw_or_graded: 'RAW', limit: 2 });
  await expect(
    page.getByRole('heading', { name: /Explore the evidence/ }),
  ).toBeVisible();
  await expect(page.getByTestId('applied-filters')).toContainText('RAW');
  await expect(
    page.getByTestId('search-results').getByRole('button'),
  ).toHaveCount(2);
  await call(page, 'get_card_market_state', {
    card_id: 'card-ember-dragon-ex',
  });
  await expect(page.getByTestId('listing-card')).toHaveCount(6);
  await call(page, 'assess_listing', { listing_id: 'listing-hf-1042' });
  await expect(page.getByText('$425.00').first()).toBeVisible();
  await call(page, 'compare_listings', {
    listing_ids: ['listing-hf-1042', 'listing-cc-8841'],
  });
  await expect(
    page.getByRole('heading', { name: 'Compare 2 listings' }),
  ).toBeVisible();
  await call(page, 'compare_raw_vs_graded', {
    card_id: 'card-ember-dragon-ex',
  });
  await expect(
    page.getByRole('heading', {
      name: 'Raw versus graded, without false equivalence',
    }),
  ).toBeVisible();
  await call(page, 'search_cards', { query: 'no such card' });
  await expect(page.getByTestId('listing-card')).toHaveCount(0);
  await expect(page.getByText('Selected listing', { exact: true })).toHaveCount(
    0,
  );
});

test('tool validation, page lifecycle and reload preserve a single registration set', async ({
  page,
}) => {
  await mockTools(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('6 agent tools ready');
  const error = await page.evaluate(() => {
    try {
      (window as unknown as Harness).scoutTools.find_deals.execute({
        minimum_seller_trust: 101,
      });
      return '';
    } catch (error) {
      return String(error);
    }
  });
  expect(error).toContain('100');
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide')),
  );
  expect(
    await page.evaluate(
      () => Object.keys((window as unknown as Harness).scoutTools).length,
    ),
  ).toBe(0);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => Object.keys((window as unknown as Harness).scoutTools).length,
      ),
    )
    .toBe(6);
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('6 agent tools ready');
});

test('registration failure cleans partial tools and leaves manual use available', async ({
  page,
}) => {
  await mockTools(page, true);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText(
    'Agent tools unavailable · reload to retry',
  );
  expect(
    await page.evaluate(
      () => Object.keys((window as unknown as Harness).scoutTools).length,
    ),
  ).toBe(0);
  await page.getByTestId('search-input').fill('Volt Lynx');
  await page.getByTestId('search-submit').click();
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
});

test('desktop and mobile render with working navigation and no horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(6);
  await expect(page.getByRole('status')).toHaveText(
    'Manual mode · WebMCP unavailable',
    { timeout: 15000 },
  );
  await page.screenshot({
    path: '../../outputs/scout-desktop.png',
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: '../../outputs/scout-mobile.png',
    fullPage: false,
  });
  const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await nav.getByRole('button', { name: 'Methods', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /A score should be/ }),
  ).toBeVisible();
  await nav.getByRole('button', { name: 'Sources', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /No provider goes live/ }),
  ).toBeVisible();
  await nav.getByRole('button', { name: 'Market', exact: true }).click();
  await page.getByTestId('search-input').fill('Tide Oracle raw');
  await page.getByTestId('search-submit').click();
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
});

test('HTTP HTML preserves the document policy and static asset caching', async ({
  page,
  request,
}) => {
  let html = '';
  for (const path of ['/', '/index.html']) {
    for (const method of ['GET', 'HEAD'] as const) {
      const response = await request.fetch(path, { method });
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
      expect(response.headers()['cache-control']).toBe(
        'public, max-age=0, must-revalidate, no-transform',
      );
      expect(response.headers()['content-security-policy']).toContain(
        "script-src 'self'",
      );
      expect(response.headers()['content-security-policy']).not.toContain(
        "script-src 'self' 'unsafe-inline'",
      );
      if (method === 'HEAD') expect(await response.body()).toHaveLength(0);
      else {
        const body = await response.text();
        if (html) expect(body).toBe(html);
        html = body;
        expect(body).toContain('type="application/ld+json"');
      }
    }
  }
  await page.goto('/');
  const script = await page.locator('script[src]').first().getAttribute('src');
  expect(script).toMatch(/^\/assets\//);
  for (const method of ['GET', 'HEAD'] as const) {
    const asset = await request.fetch(script!, { method });
    expect(asset.status()).toBe(200);
    expect(asset.headers()['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    );
    if (method === 'HEAD') expect(await asset.body()).toHaveLength(0);
    else expect(await asset.body()).not.toHaveLength(0);
  }
  const discovery = await request.get('/llms.txt');
  expect(discovery.headers()['cache-control']).toBe(
    'public, max-age=0, must-revalidate',
  );
});
