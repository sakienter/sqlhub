const DEFAULT_TRIBE_CONFIG = {
  DAY1: {},
  DAY2: {},
  DAY3: {},
  DAY4: {}
};

export async function onRequestGet(context) {
  const config = await readConfig(context);

  return jsonResponse(config, 200, {
    'Cache-Control': 'no-store'
  });
}

async function readConfig(context) {
  const kv = context.env.TRIBE_CONFIG;

  if (!kv) {
    return DEFAULT_TRIBE_CONFIG;
  }

  const data = await kv.get('season2-tribes', 'json');
  return data || DEFAULT_TRIBE_CONFIG;
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
