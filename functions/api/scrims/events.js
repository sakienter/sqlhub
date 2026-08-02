const DEFAULT_EVENTS = [
  { id: '2026-06-18', eventDate: '2026-06-18', startTime: '21:00', gatherTime: '20:30' },
  { id: '2026-06-19', eventDate: '2026-06-19', startTime: '21:00', gatherTime: '20:30' }
];

const LIFECYCLES = new Set(['open', 'closed', 'completed']);
const PAST_LOBBY_KEY = 'scrim-past-lobbies';
const MAX_LOBBIES = 300;

export async function onRequestGet(context) {
  const db = context.env.SCRIM_DB;
  if (!db) return missingDatabase();

  try {
    await ensureEventsTable(db);
    const url = new URL(context.request.url);
    const includeAll = url.searchParams.get('all') === '1';

    if (includeAll) {
      const authError = authorizeAdmin(context);
      if (authError) return authError;
    }

    const where = includeAll ? 'WHERE is_completed = 0' : "WHERE status = 'open' AND is_completed = 0";
    const result = await db.prepare(`
      SELECT id, event_name AS eventName, event_date AS eventDate, start_time AS startTime,
        gather_time AS gatherTime, reception_open_at AS receptionOpenAt,
        reception_close_at AS receptionCloseAt, status, is_completed AS isCompleted,
        result_url AS resultUrl, created_at AS createdAt, updated_at AS updatedAt
      FROM scrim_events
      ${where}
      ORDER BY event_date ASC, start_time ASC
    `).all();

    const events = (Array.isArray(result.results) ? result.results : []).map(serializeEvent);
    return json({ events }, 200);
  } catch (error) {
    return databaseError(error, '開催日程を読み込めませんでした。');
  }
}

export async function onRequestPost(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const db = context.env.SCRIM_DB;
  if (!db) return missingDatabase();

  const body = await readBody(context.request);
  const parsed = parseEventFields(body, { includeDate: true });
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { eventName, eventDate, startTime, gatherTime, receptionOpenAt, receptionCloseAt } = parsed.fields;

  const now = new Date().toISOString();

  try {
    await ensureEventsTable(db);
    await db.prepare(`
      INSERT INTO scrim_events (
        id, event_name, event_date, start_time, gather_time, reception_open_at, reception_close_at, status,
        is_completed, result_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', 0, '', ?, ?)
    `).bind(eventDate, eventName, eventDate, startTime, gatherTime, receptionOpenAt, receptionCloseAt, now, now).run();

    return json({ event: serializeEvent(await findEvent(db, eventDate)) }, 201);
  } catch (error) {
    if (isConstraintError(error)) {
      return json({ error: '同じ開催日はすでに登録されています。' }, 409);
    }
    return databaseError(error, '開催日程を登録できませんでした。');
  }
}

export async function onRequestPatch(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const db = context.env.SCRIM_DB;
  if (!db) return missingDatabase();

  const body = await readBody(context.request);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) return json({ error: '変更する日程を特定できませんでした。' }, 400);
  const parsed = parseEventFields(body, { includeLifecycle: true });
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { lifecycle, resultUrl } = parsed.fields;
  const completionError = validateCompletion(lifecycle, resultUrl, context.env.TRIBE_CONFIG);
  if (completionError) return json({ error: completionError.message }, completionError.status);

  try {
    await ensureEventsTable(db);
    const previous = await findEvent(db, id);
    if (!previous) return json({ error: '対象の日程が見つかりませんでした。' }, 404);

    await updateEventWithPastLobby(context, db, id, previous, parsed.fields);

    return json({
      event: serializeEvent(await findEvent(db, id)),
      pastLobbySynced: lifecycle === 'completed'
    }, 200);
  } catch (error) {
    return databaseError(error, '開催日程またはPast Lobbyを更新できませんでした。');
  }
}

function validateCompletion(lifecycle, resultUrl, lobbyStore) {
  if (lifecycle !== 'completed') return null;
  if (!resultUrl) {
    return { message: '開催終了にするには、結果スプレッドシートURLを入力してください。', status: 400 };
  }
  if (!lobbyStore) {
    return { message: 'Past Lobbyの保存先KVが設定されていません。', status: 503 };
  }
  return null;
}

async function updateEventWithPastLobby(context, db, id, previous, fields) {
  await persistEventUpdate(db, id, previous, fields);
  try {
    await syncPastLobby(context, {
      eventId: id,
      eventName: fields.eventName,
      eventDate: previous.eventDate,
      resultUrl: fields.resultUrl || '',
      completed: fields.lifecycle === 'completed'
    });
  } catch (error) {
    await restoreEventUpdate(db, id, previous);
    throw error;
  }
}

async function persistEventUpdate(db, id, previous, fields) {
  const {
    eventName, startTime, gatherTime, receptionOpenAt, receptionCloseAt, lifecycle, resultUrl
  } = fields;
  const storedStatus = lifecycle === 'open' ? 'open' : 'closed';
  const completed = lifecycle === 'completed' ? 1 : 0;
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE scrim_events
    SET event_name = ?, start_time = ?, gather_time = ?, reception_open_at = ?, reception_close_at = ?, status = ?, is_completed = ?,
      result_url = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    eventName, startTime, gatherTime, receptionOpenAt, receptionCloseAt,
    storedStatus, completed, resultUrl || '', now, id
  ).run();

  await updateRegistrationLabels(
    db,
    id,
    formatDisplayLabel(eventName, previous.eventDate, startTime),
    now
  );
}

async function restoreEventUpdate(db, id, previous) {
  await db.prepare(`
    UPDATE scrim_events
    SET event_name = ?, start_time = ?, gather_time = ?, reception_open_at = ?, reception_close_at = ?, status = ?, is_completed = ?,
      result_url = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    previous.eventName || '', previous.startTime, previous.gatherTime || '',
    previous.receptionOpenAt || '', previous.receptionCloseAt || '', previous.status,
    Number(previous.isCompleted || 0), previous.resultUrl || '', previous.updatedAt, id
  ).run();

  await updateRegistrationLabels(
    db,
    id,
    formatDisplayLabel(previous.eventName || '', previous.eventDate, previous.startTime),
    previous.updatedAt
  );
}

async function updateRegistrationLabels(db, eventId, label, updatedAt) {
  await db.prepare(`
    UPDATE scrim_registrations SET event_label = ?, updated_at = ? WHERE event_id = ?
  `).bind(label, updatedAt, eventId).run();
}

export async function onRequestDelete(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const db = context.env.SCRIM_DB;
  if (!db) return missingDatabase();

  const body = await readBody(context.request);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) return json({ error: '削除する日程を特定できませんでした。' }, 400);

  try {
    await ensureEventsTable(db);
    const existing = await findEvent(db, id);
    if (!existing) return json({ error: '対象の日程が見つかりませんでした。' }, 404);

    const count = await db.prepare(
      'SELECT COUNT(*) AS count FROM scrim_registrations WHERE event_id = ?'
    ).bind(id).first();

    if (Number(count?.count || 0) > 0) {
      return json({ error: 'この日程には参加申請があるため削除できません。受付停止へ変更してください。' }, 409);
    }

    await db.prepare('DELETE FROM scrim_events WHERE id = ?').bind(id).run();
    await syncPastLobby(context, {
      eventId: id,
      eventDate: existing.eventDate,
      resultUrl: '',
      completed: false
    });

    return json({ result: 'success' }, 200);
  } catch (error) {
    return databaseError(error, '開催日程を削除できませんでした。');
  }
}

async function ensureEventsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS scrim_events (
      id TEXT PRIMARY KEY,
      event_name TEXT NOT NULL DEFAULT '',
      event_date TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL,
      gather_time TEXT NOT NULL DEFAULT '',
      reception_open_at TEXT NOT NULL DEFAULT '',
      reception_close_at TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      is_completed INTEGER NOT NULL DEFAULT 0,
      result_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  const info = await db.prepare('PRAGMA table_info(scrim_events)').all();
  const columns = new Set((info.results || []).map((column) => column.name));

  if (!columns.has('is_completed')) {
    await db.prepare('ALTER TABLE scrim_events ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0').run();
  }
  if (!columns.has('event_name')) {
    await db.prepare("ALTER TABLE scrim_events ADD COLUMN event_name TEXT NOT NULL DEFAULT ''").run();
  }
  if (!columns.has('result_url')) {
    await db.prepare("ALTER TABLE scrim_events ADD COLUMN result_url TEXT NOT NULL DEFAULT ''").run();
  }
  if (!columns.has('reception_open_at')) await db.prepare("ALTER TABLE scrim_events ADD COLUMN reception_open_at TEXT NOT NULL DEFAULT ''").run();
  if (!columns.has('reception_close_at')) await db.prepare("ALTER TABLE scrim_events ADD COLUMN reception_close_at TEXT NOT NULL DEFAULT ''").run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_scrim_events_status_date
    ON scrim_events (status, event_date, start_time)
  `).run();

  const now = new Date().toISOString();
  for (const event of DEFAULT_EVENTS) {
    await db.prepare(`
      INSERT OR IGNORE INTO scrim_events (
        id, event_name, event_date, start_time, gather_time, reception_open_at, reception_close_at, status,
        is_completed, result_url, created_at, updated_at
      ) VALUES (?, '', ?, ?, ?, '', '', 'open', 0, '', ?, ?)
    `).bind(event.id, event.eventDate, event.startTime, event.gatherTime, now, now).run();
  }
}

async function syncPastLobby(context, event) {
  const kv = context.env.TRIBE_CONFIG;
  if (!kv) {
    if (event.completed) throw new Error('Past Lobbyの保存先KVが設定されていません。');
    return;
  }

  const stored = await kv.get(PAST_LOBBY_KEY, 'json');
  const lobbies = Array.isArray(stored?.lobbies) ? stored.lobbies : [];
  const autoId = `scrim-event-${event.eventId}`;
  const withoutAuto = lobbies.filter((lobby) => lobby?.id !== autoId);

  if (event.completed) {
    const duplicate = withoutAuto.some(
      (lobby) => lobby?.date === event.eventDate && lobby?.spreadsheetUrl === event.resultUrl
    );

    if (!duplicate) {
      if (withoutAuto.length >= MAX_LOBBIES) throw new Error('Past Lobbyの登録件数上限に達しています。');
      withoutAuto.push({
        id: autoId,
        name: event.eventName || '',
        date: event.eventDate,
        spreadsheetUrl: event.resultUrl,
        createdAt: new Date().toISOString(),
        source: 'scrim-event',
        eventId: event.eventId
      });
    }
  }

  withoutAuto.sort((a, b) => {
    if (a.date !== b.date) return String(b.date || '').localeCompare(String(a.date || ''));
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  await kv.put(PAST_LOBBY_KEY, JSON.stringify({ lobbies: withoutAuto }));
}

function serializeEvent(event) {
  const lifecycle = Number(event.isCompleted || 0) === 1 ? 'completed' : event.status;
  return {
    id: event.id,
    eventId: event.id,
    eventName: event.eventName || '',
    eventDate: event.eventDate,
    startTime: event.startTime,
    gatherTime: event.gatherTime || '',
    receptionOpenAt: event.receptionOpenAt || '',
    receptionCloseAt: event.receptionCloseAt || '',
    receptionStatus: receptionStatus(event),
    status: lifecycle,
    resultUrl: event.resultUrl || '',
    displayLabel: formatDisplayLabel(event.eventName, event.eventDate, event.startTime),
    detailLabel: event.gatherTime
      ? `${formatDisplayLabel(event.eventName, event.eventDate, event.startTime)}／${event.gatherTime} 集合`
      : formatDisplayLabel(event.eventName, event.eventDate, event.startTime),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

async function findEvent(db, id) {
  return db.prepare(`
    SELECT id, event_name AS eventName, event_date AS eventDate, start_time AS startTime,
      gather_time AS gatherTime, reception_open_at AS receptionOpenAt,
      reception_close_at AS receptionCloseAt, status, is_completed AS isCompleted,
      result_url AS resultUrl, created_at AS createdAt, updated_at AS updatedAt
    FROM scrim_events WHERE id = ?
  `).bind(id).first();
}

function formatLabel(eventDate, startTime) {
  const date = parseDate(eventDate);
  if (!date) return `${eventDate} ${startTime} 開始`;
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日（${weekdays[date.getUTCDay()]}）${startTime} 開始`;
}

function formatDisplayLabel(eventName, eventDate, startTime) {
  const schedule = formatLabel(eventDate, startTime);
  return eventName ? `${eventName}｜${schedule}` : schedule;
}

function authorizeAdmin(context) {
  const expected = context.env.SCRIM_ADMIN_TOKEN;
  if (!expected) return json({ error: '管理用パスワードが設定されていません。' }, 503);
  return context.request.headers.get('Authorization') === `Bearer ${expected}`
    ? null
    : json({ error: '管理用パスワードが正しくありません。' }, 401);
}

function normalizeLifecycle(value) {
  if (typeof value !== 'string') return null;
  const lifecycle = value.trim();
  return LIFECYCLES.has(lifecycle) ? lifecycle : null;
}

function parseEventFields(body, { includeDate = false, includeLifecycle = false } = {}) {
  const fields = {
    eventName: normalizeEventName(body?.eventName ?? body?.name),
    startTime: normalizeTime(body?.startTime),
    gatherTime: normalizeOptionalTime(body?.gatherTime),
    receptionOpenAt: normalizeReceptionDateTime(body?.receptionOpenAt),
    receptionCloseAt: normalizeReceptionDateTime(body?.receptionCloseAt)
  };

  if (includeDate) fields.eventDate = normalizeDate(body?.eventDate ?? body?.date);
  if (includeLifecycle) {
    fields.lifecycle = normalizeLifecycle(body?.status);
    fields.resultUrl = normalizeSpreadsheetUrl(body?.resultUrl);
  }

  return {
    fields,
    error: eventFieldError(body, fields, { includeDate, includeLifecycle })
  };
}

function eventFieldError(body, fields, { includeDate, includeLifecycle }) {
  if (fields.eventName === null) return 'スクリム名は60文字以内で入力してください。';
  if (includeDate && !fields.eventDate) return '開催日を正しく入力してください。';
  if (!fields.startTime) return '開始時刻を正しく入力してください。';
  if (body?.gatherTime && !fields.gatherTime) return '集合時刻を正しく入力してください。';
  if (body?.receptionOpenAt && !fields.receptionOpenAt) return '受付開始日時を正しく入力してください。';
  if (body?.receptionCloseAt && !fields.receptionCloseAt) return '受付終了日時を正しく入力してください。';
  if (fields.receptionOpenAt && fields.receptionCloseAt && fields.receptionOpenAt >= fields.receptionCloseAt) {
    return '受付終了日時は、受付開始日時より後に設定してください。';
  }
  if (includeLifecycle && !fields.lifecycle) return '開催状態が正しくありません。';
  if (includeLifecycle && body?.resultUrl && !fields.resultUrl) {
    return 'GoogleスプレッドシートのURLを正しく入力してください。';
  }
  return '';
}

function normalizeEventName(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length <= 60 ? name : null;
}

function normalizeDate(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return parseDate(trimmed) ? trimmed : null;
}

function parseDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

function normalizeTime(value) {
  if (typeof value !== 'string') return null;
  const time = value.trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : null;
}

function normalizeOptionalTime(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  return normalizeTime(value);
}

function normalizeReceptionDateTime(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const trimmed = value.trim();
  const local = trimmed.match(/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/);
  const date = local ? new Date(`${local[1]}T${local[2]}:${local[3]}:00+09:00`) : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function receptionStatus(event) {
  const now = Date.now();
  const opens = event.receptionOpenAt ? Date.parse(event.receptionOpenAt) : NaN;
  const closes = event.receptionCloseAt ? Date.parse(event.receptionCloseAt) : NaN;
  if (!Number.isNaN(opens) && now < opens) return 'upcoming';
  if (!Number.isNaN(closes) && now >= closes) return 'closed';
  return 'open';
}

function normalizeSpreadsheetUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || !url.pathname.startsWith('/spreadsheets/')) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isConstraintError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('constraint') || message.includes('unique');
}

async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

function missingDatabase() {
  return json({ error: 'D1データベースが設定されていません。' }, 503);
}

function databaseError(error, message) {
  console.error('Scrim event error', error);
  return json({ error: String(error?.message || '').includes('Past Lobby') ? error.message : message }, 500);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
