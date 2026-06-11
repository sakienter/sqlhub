export async function onRequest(context) {
  const gasUrl = context.env.GAS_URL_S2;

  if (!gasUrl) {
    return jsonResponse(
      {
        title: 'S級リーグS2',
        updatedAt: new Date().toISOString(),
        summary: { headers: [], rows: [] },
        days: [],
        error: 'GAS_URL_S2 is not set'
      },
      500,
      { 'Cache-Control': 'no-store' }
    );
  }

  const cache = caches.default;
  const cacheKey = new Request(context.request.url, context.request);

  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;

  try {
    const response = await fetch(gasUrl, {
      headers: { 'User-Agent': 'Cloudflare Pages Function' },
      cf: { cacheTtl: 300, cacheEverything: true }
    });

    if (!response.ok) {
      return jsonResponse(
        {
          title: 'S級リーグS2',
          updatedAt: new Date().toISOString(),
          summary: { headers: [], rows: [] },
          days: [],
          error: `Apps Script error: ${response.status}`
        },
        502,
        { 'Cache-Control': 'no-store' }
      );
    }

    const data = await response.json();
    const result = jsonResponse(data, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900'
    });

    context.waitUntil(cache.put(cacheKey, result.clone()));
    return result;
  } catch (error) {
    return jsonResponse(
      {
        title: 'S級リーグS2',
        updatedAt: new Date().toISOString(),
        summary: { headers: [], rows: [] },
        days: [],
        error: String(error && error.message ? error.message : error)
      },
      500,
      { 'Cache-Control': 'no-store' }
    );
  }
}

function jsonResponse(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });
}
