const CONFIG_KEY = 'season2-tribes';
const TRIBES = ['アンデッド', 'エレメンタル', 'ドラゴン', 'キルボア', 'ナーガ', 'マーロック', 'メカ', '悪魔', '海賊', '獣'];

export async function onRequestPost(context) {
  const kv = context.env.TRIBE_CONFIG;
  const adminPassword = context.env.ADMIN_PASSWORD;

  if (!kv) {
    return jsonResponse({ ok: false, error: 'TRIBE_CONFIG KV binding is not set' }, 500);
  }

  if (!adminPassword) {
    return jsonResponse({ ok: false, error: 'ADMIN_PASSWORD is not set' }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
  }

  if (!body || body.password !== adminPassword) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  const day = normalizeKey(body.day);
  const game = normalizeKey(body.game);
  const available = normalizeTribes(body.available);

  if (!/^DAY[1-4]$/.test(day) || !/^GAME[1-5]$/.test(game)) {
    return jsonResponse({ ok: false, error: 'Invalid day or game' }, 400);
  }

  const current = (await kv.get(CONFIG_KEY, 'json')) || {};
  if (!current[day]) current[day] = {};

  current[day][game] = {
    available,
    unavailable: TRIBES.filter(tribe => !available.includes(tribe)),
    updatedAt: new Date().toISOString()
  };

  await kv.put(CONFIG_KEY, JSON.stringify(current));

  return jsonResponse({ ok: true, config: current }, 200, {
    'Cache-Control': 'no-store'
  });
}

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function normalizeTribes(values) {
  const set = new Set(Array.isArray(values) ? values : []);
  return TRIBES.filter(tribe => set.has(tribe));
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
