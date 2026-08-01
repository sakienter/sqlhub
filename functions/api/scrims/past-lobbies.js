const STORAGE_KEY = 'scrim-past-lobbies';
const MAX_LOBBIES = 300;

export async function onRequestGet(context) {
  const data = await readLobbyData(context);
  return jsonResponse(data, 200, {
    'Cache-Control': 'no-store, max-age=0'
  });
}

export async function onRequestPost(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const kv = context.env.TRIBE_CONFIG;
  if (!kv) {
    return jsonResponse({ error: '保存先のKVが設定されていません。' }, 503);
  }

  const body = await readJsonBody(context.request);
  if (!body) {
    return jsonResponse({ error: '入力内容を読み取れませんでした。' }, 400);
  }

  const date = normalizeDate(body.date);
  const name = normalizeLobbyName(body.name ?? body.lobbyName);
  const spreadsheetUrl = normalizeSpreadsheetUrl(body.spreadsheetUrl);

  if (name === null) {
    return jsonResponse({ error: '大会名・スクリム名は60文字以内で入力してください。' }, 400);
  }

  if (!date) {
    return jsonResponse({ error: '日付を正しく入力してください。' }, 400);
  }

  if (!spreadsheetUrl) {
    return jsonResponse({ error: 'GoogleスプレッドシートのURLを正しく入力してください。' }, 400);
  }

  const data = await readLobbyData(context);
  const lobbies = Array.isArray(data.lobbies) ? data.lobbies : [];
  const isDuplicate = lobbies.some(
    (lobby) => lobby.date === date && lobby.spreadsheetUrl === spreadsheetUrl
  );

  if (isDuplicate) {
    return jsonResponse({ error: '同じ日付とURLのロビーはすでに登録されています。' }, 409);
  }

  if (lobbies.length >= MAX_LOBBIES) {
    return jsonResponse({ error: '登録件数の上限に達しています。' }, 400);
  }

  const lobby = {
    id: crypto.randomUUID(),
    name,
    date,
    spreadsheetUrl,
    createdAt: new Date().toISOString()
  };

  const updated = {
    lobbies: [...lobbies, lobby].sort(sortNewestFirst)
  };

  await kv.put(STORAGE_KEY, JSON.stringify(updated));
  return jsonResponse(updated, 201, {
    'Cache-Control': 'no-store, max-age=0'
  });
}

export async function onRequestDelete(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const kv = context.env.TRIBE_CONFIG;
  if (!kv) {
    return jsonResponse({ error: '保存先のKVが設定されていません。' }, 503);
  }

  const body = await readJsonBody(context.request);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';

  if (!id) {
    return jsonResponse({ error: '削除するロビーを特定できませんでした。' }, 400);
  }

  const data = await readLobbyData(context);
  const lobbies = Array.isArray(data.lobbies) ? data.lobbies : [];
  const updatedLobbies = lobbies.filter((lobby) => lobby.id !== id);

  if (updatedLobbies.length === lobbies.length) {
    return jsonResponse({ error: '対象のロビーが見つかりませんでした。' }, 404);
  }

  const updated = { lobbies: updatedLobbies.sort(sortNewestFirst) };
  await kv.put(STORAGE_KEY, JSON.stringify(updated));

  return jsonResponse(updated, 200, {
    'Cache-Control': 'no-store, max-age=0'
  });
}

function authorizeAdmin(context) {
  const expectedToken = context.env.SCRIM_ADMIN_TOKEN;

  if (!expectedToken) {
    return jsonResponse({ error: '管理用パスワードが設定されていません。' }, 503);
  }

  const authorization = context.request.headers.get('Authorization') || '';
  if (authorization !== `Bearer ${expectedToken}`) {
    return jsonResponse({ error: '管理用パスワードが正しくありません。' }, 401);
  }

  return null;
}

async function readLobbyData(context) {
  const kv = context.env.TRIBE_CONFIG;
  if (!kv) return { lobbies: [] };

  const data = await kv.get(STORAGE_KEY, 'json');
  const lobbies = Array.isArray(data?.lobbies) ? data.lobbies : [];

  return {
    lobbies: lobbies
      .filter(isValidStoredLobby)
      .sort(sortNewestFirst)
  };
}

function isValidStoredLobby(lobby) {
  return Boolean(
    lobby &&
    typeof lobby.id === 'string' &&
    normalizeDate(lobby.date) &&
    normalizeSpreadsheetUrl(lobby.spreadsheetUrl)
  );
}

function normalizeLobbyName(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length <= 60 ? trimmed : null;
}

function normalizeDate(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return trimmed;
}

function normalizeSpreadsheetUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    if (url.hostname !== 'docs.google.com') return null;
    if (!url.pathname.startsWith('/spreadsheets/')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function sortNewestFirst(a, b) {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
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
