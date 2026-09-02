const { default: worker } = await import(`../dist/server/index.js?build=${Date.now()}`);

const rootResponse = await worker.fetch(new Request('https://scout.invalid/'));
if (rootResponse.status !== 200) throw new Error(`Sites worker root returned ${rootResponse.status}.`);
if (!rootResponse.headers.get('content-type')?.startsWith('text/html')) {
  throw new Error('Sites worker root did not return HTML.');
}
if (!(await rootResponse.text()).includes('id="root"')) {
  throw new Error('Sites worker root did not contain the Vite application shell.');
}

const missingResponse = await worker.fetch(
  new Request('https://scout.invalid/missing.png', { headers: { accept: 'image/png' } }),
);
if (missingResponse.status !== 404) throw new Error('Sites worker did not preserve asset 404s.');

const methodResponse = await worker.fetch(
  new Request('https://scout.invalid/', { method: 'POST' }),
);
if (methodResponse.status !== 405) throw new Error('Sites worker did not reject write methods.');
