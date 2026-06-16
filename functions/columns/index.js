export async function onRequest(context) {
  const response = await context.env.ASSETS.fetch(context.request);

  if (context.request.method !== 'GET' || !response.ok) {
    return response;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const original = await response.text();
  const target = '<figcaption style="margin-top: 10px; color: #647084; font-size: 13px; line-height: 1.7;">このページで扱うアーマーは、ヒーロー「ピン・ゾロ」の通常アーマーです。</figcaption>';
  const replacement = `<figcaption style="margin-top: 10px; color: #647084; font-size: 13px; line-height: 1.7;">
            このページで扱うアーマーは、ヒーロー「ピン・ゾロ」の通常アーマーです。<br>
            <a href="/columns/pinzoro-100cc/" style="display:inline-block; margin-top:6px; color:#8a5a18; font-weight:700; text-decoration:none; border-bottom:1px solid rgba(138,90,24,.35);">「ピン・ゾロ」VIP用</a>
          </figcaption>`;

  if (!original.includes(target)) {
    return new Response(original, response);
  }

  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-cache');

  return new Response(original.replace(target, replacement), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
