export async function onRequest(context) {
  const assetResponse = await context.env.ASSETS.fetch(context.request);
  const contentType = assetResponse.headers.get('Content-Type') || '';

  if (!contentType.includes('text/html')) {
    return assetResponse;
  }

  const html = await assetResponse.text();
  const headers = new Headers(assetResponse.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');

  return new Response(html.replaceAll('順位入力', 'Placement'), {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers
  });
}
