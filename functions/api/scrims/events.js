const DEFAULT_EVENTS = [
  {
    id: '2026-06-18',
    eventDate: '2026-06-18',
    startTime: '21:00',
    gatherTime: '20:30',
    status: 'open'
  },
  {
    id: '2026-06-19',
    eventDate: '2026-06-19',
    startTime: '21:00',
    gatherTime: '20:30',
    status: 'open'
  }
];

const ALLOWED_STATUSES = new Set(['open', 'closed']);

export async function onRequestGet(context) {
  const db = getDatabase(context);
  if (!db) return databaseMissingResponse();

  try {
    await ensureEventsTable(db);

    const url = new URL(context.request.url);
    const includeClosed = url.searchParams.get('all') === '1';

    if (includeClosed) {
      const authError = authorizeAdmin(context);
      if (authError) return authError;
    }

    const where = includeClosed ? '' : "WHERE status = 'open'";
    const result = await db.prepare(`
      SELECT
        id,
        event_date AS eventDate,
        start_time AS startTime,
        gather_time AS gatherTime,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM scrim_events
      ${where}
      ORDER BY event_date ASC, start_time ASC
    `).all();

    const events = (Array.isArray(result.results) ? result.results : []).map(serializeEvent);
    return jsonResponse({ events }, 200, noStoreHeaders());
  } catch (error) {
    return databaseErrorResponse(error, '開催日程を読み込めませんでした。');
  }
}

export async function onRequestPost(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const db = getDatabase(context);
  if (!db) return databaseMissingResponse();

  const body = await readJsonBody(context.request);
  if (!body) {
    return jsonResponse({ error: '入力内容を読み取れませんでした。' }, 400);
  }

  const eventDate = normalizeDate(body.eventDate ?? body.date);
  const startTime = normalizeTime(body.startTime);
  const gatherTime = normalizeOptionalTime(body.gatherTime);

  if (!eventDate) {
    return jsonResponse({ error: '開催日を正しく入力してください。' }, 400);
  }

  if (!startTime) {
    return jsonResponse({ error: '開始時刻を正しく入力してください。' }, 400);
  }

  if (body.gatherTime && !gatherTime) {
    return jsonResponse({ error: '集合時刻を正しく入力してください。' }, 400);
  }

  const id = eventDate;
  const now = new Date().toISOString();

  try {
    await ensureEventsTable(db);
    await db.prepare(`
      INSERT INTO scrim_events (
        id,
        event_date,
        start_time,
        gather_time,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'open', ?, ?)
    `).bind(id, eventDate, startTime, gatherTime, now, now).run();

    const event = await findEventById(db, id);
    return jsonResponse({ event: serializeEvent(event) }, 201, noStoreHeaders());
  } catch (error) {
    if (isConstraintError(error)) {
      return jsonResponse({ error: '同じ開催日はすでに登録されています。' }, 409);
    }

    return databaseErrorResponse(error, '開催日程を登録できませんでした。');
  }
}

export async function onRequestPatch(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const db = getDatabase(context);
  if (!db) return databaseMissingResponse();

  const body = await readJsonBody(context.request);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  const startTime = normalizeTime(body?.startTime);
  const gatherTime = normalizeOptionalTime(body?.gatherTime);
  const status = normalizeStatus(body?.status);

  if (!id) {
    return jsonResponse({ error: '変更する日程を特定できませんでした。' }, 400);
  }

  if (!startTime) {
    return jsonResponse({ error: '開始時刻を正しく入力してください。' }, 400);
  }

  if (body?.gatherTime && !gatherTime) {
    return jsonResponse({ error: '集合時刻を正しく入力してください。' }, 400);
  }

  if (!status) {
    return jsonResponse({ error: '受付状態が正しくありません。' }, 400);
  }

  try {
    await ensureEventsTable(db);
    const now = new Date().toISOString();
    const result = await db.prepare(`
      UPDATE scrim_events
      SET start_time = ?, gather_time = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).bind(startTime, gatherTime, status, now, id).run();

    if (!result.meta?.changes) {
      return jsonResponse({ error: '対象の日程が見つかりませんでした。' }, 404);
    }

    const event = await findEventById(db, id);
    return jsonResponse({ event: serializeEvent(event) }, 200, noStoreHeaders());
  } catch (error) {
    return databaseErrorResponse(error, '開催日程を更新できませんでした。');
  }
}

export async function onRequestDelete(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const db = getDatabase(context);
  if (!db) return databaseMissingResponse();

  const body = await readJsonBody(context.request);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';

  if (!id) {
    return jsonResponse({ error: '削除する日程を特定できませんでした。' }, 400);
  }

  try {
    await ensureEventsTable(db);

    const registrationCount = await db.prepare(`
      SELECT COUNT(*) AS count
      FROM scrim_registrations
      WHERE event_id = ?
    `).bind(id).first();

    if (Number(registrationCount?.count || 0) > 0) {
      return jsonResponse({
        error: 'この日程には参加申請があるため削除できません。受付停止へ変更してください。'
      }, 409);
    }

    const result = await db.prepare(
      'DELETE FROM scrim_events WHERE id = ?'
    ).bind(id).run();

    if (!result.meta?.changes) {
      return jsonResponse({ error: '対象の日程が見つかりませんでした。' }, 404);
    }

    return jsonResponse({ result: 'success' }, 200, noStoreHeaders());
  } catch (error) {
    return databaseErrorResponse(error, '開催日程を削除できませんでした。');
  }
}

export async function ensureEventsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS scrim_events (
      id TEXT PRIMARY KEY,
      event_date TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL,
      gather_time TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_scrim_events_status_date
    ON scrim_events (status, event_date, start_time)
  `).run();

  const now = new Date().toISOString();
  for (const event of DEFAULT_EVENTS) {
    await db.prepare(`
      INSERT OR IGNORE INTO scrim_events (
        id,
        event_date,
        start_time,
        gather_time,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event.id,
      event.eventDate,
      event.startTime,
      event.gatherTime,
      event.status,
      now,
      now
    ).run();
  }
}

function serializeEvent(event) {
  if (!event) return null;

  return {
    id: event.id,
    eventId: event.id,
    eventDate: event.eventDate,
    startTime: event.startTime,
    gatherTime: event.gatherTime || '',
    status: event.status,
    displayLabel: formatDisplayLabel(event.eventDate, event.startTime),
    detailLabel: formatDetailLabel(event.eventDate, event.startTime, event.gatherTime),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

function formatDisplayLabel(eventDate, startTime) {
  const date = parseDate(eventDate);
  if (!date) return `${eventDate} ${startTime} 開始`;

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日（${weekdays[date.getUTCDay()]}）${startTime} 開始`;
}

function formatDetailLabel(eventDate, startTime, gatherTime) {
  const base = formatDisplayLabel(eventDate, startTime);
  return gatherTime ? `${base}／${gatherTime} 集合` : base;
}

function getDatabase(context) {
  return context.env.SCRIM_DB || null;
}

function databaseMissingResponse() {
  return jsonResponse({
    error: 'D1データベースが設定されていません。',
    code: 'database_not_configured'
  }, 503);
}

function databaseErrorResponse(error, message) {
  console.error('Scrim event database error', error);
  return jsonResponse({ error: message }, 500);
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

function normalizeDate(value) {
  if (typeof value !== 'string') return null;
  const date = value.trim();
  return parseDate(date) ? date : null;
}

function parseDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

  return date;
}

function normalizeTime(value) {
  if (typeof value !== 'string') return null;
  const time = value.trim();
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? time : null;
}

function normalizeOptionalTime(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  return normalizeTime(value);
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return null;
  const status = value.trim();
  return ALLOWED_STATUSES.has(status) ? status : null;
}

function isConstraintError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('constraint') || message.includes('unique');
}

async function findEventById(db, id) {
  return db.prepare(`
    SELECT
      id,
      event_date AS eventDate,
      start_time AS startTime,
      gather_time AS gatherTime,
      status,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM scrim_events
    WHERE id = ?
  `).bind(id).first();
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, max-age=0' };
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
