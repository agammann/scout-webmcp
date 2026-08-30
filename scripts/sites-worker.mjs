const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request, environment) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return withSecurityHeaders(new Response('Method not allowed', { status: 405 }));
    }

    const assetResponse = await environment.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return withSecurityHeaders(assetResponse);

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (!acceptsHtml) return withSecurityHeaders(assetResponse);

    const fallbackUrl = new URL('/index.html', request.url);
    const fallbackRequest = new Request(fallbackUrl, request);
    return withSecurityHeaders(await environment.ASSETS.fetch(fallbackRequest));
  },
};

export default worker;

