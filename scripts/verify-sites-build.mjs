const { default: worker } = await import(`../dist/server/index.js?build=${Date.now()}`);

const rootResponse = await worker.fetch(new Request('https://scout.invalid/'));
if (rootResponse.status !== 200) throw new Error(`Sites worker root returned ${rootResponse.status}.`);
if (!rootResponse.headers.get('content-type')?.startsWith('text/html')) {
  throw new Error('Sites worker root did not return HTML.');
}
if (!(await rootResponse.text()).includes('id="root"')) {
  throw new Error('Sites worker root did not contain the Vite application shell.');
}
if (rootResponse.headers.get('strict-transport-security') !== 'max-age=31536000') {
  throw new Error('Sites worker root did not include the expected HSTS policy.');
}

const discoveryFiles = [
  ['/llms.txt', 'text/plain', '# Scout'],
  ['/robots.txt', 'text/plain', 'Sitemap: https://scout-webmcp-2026.alx21.chatgpt.site/sitemap.xml'],
  ['/sitemap.xml', 'application/xml', '<urlset'],
];

for (const [path, contentType, marker] of discoveryFiles) {
  const response = await worker.fetch(new Request(`https://scout.invalid${path}`));
  if (response.status !== 200) throw new Error(`Sites worker did not serve ${path}.`);
  if (!response.headers.get('content-type')?.startsWith(contentType)) {
    throw new Error(`Sites worker returned the wrong content type for ${path}.`);
  }
  if (!(await response.text()).includes(marker)) {
    throw new Error(`Sites worker returned unexpected content for ${path}.`);
  }
}

const missingResponse = await worker.fetch(
  new Request('https://scout.invalid/missing.png', { headers: { accept: 'image/png' } }),
);
if (missingResponse.status !== 404) throw new Error('Sites worker did not preserve asset 404s.');

const methodResponse = await worker.fetch(
  new Request('https://scout.invalid/', { method: 'POST' }),
);
if (methodResponse.status !== 405) throw new Error('Sites worker did not reject write methods.');
