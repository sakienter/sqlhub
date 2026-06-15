const EVENTS = Object.freeze({
  '2026-06-18': {
    label: '6月18日（木）',
    schedule: '20:30集合／21:00開始'
  },
  '2026-06-19': {
    label: '6月19日（金）',
    schedule: '20:30集合／21:00開始'
  }
});

const ALLOWED_STATUSES = new Set([
  'pending',
  'accepted',
  'waitlisted',
  'cancelled',
  'rejected'
]);

export async function onRequestGet(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const db = getDatabase(context);
  if (!db) return databaseMissingResponse();

  const url = new URL(context.request.url);
  const eventId = normalizeEventId(url.searchParams.get('eventId'));
  const status = normalizeStatus(url.searchParams.get('status'));

  const conditions = [];
  const bindings = [];

  if (eventId) {
    conditions.push('event_id = ?');
    bindings.push(eventId);
  }

  if (status) {
    conditions.push('status = ?');
    bindings.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const statement = db.prepare(`
    SELECT
      id,
      application_code AS applicationCode,
      event_id AS eventId,
      event_label AS eventLabel,
      battle_tag AS battleTag,
      x_account AS xAccount,
      status,
      admin_note AS adminNote,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM scrim_registrations
    ${where}
    ORDER BY event_id ASC, created_at ASC
  `);

  try {
    const result = bindings.length
      ? await statement.bind(...bindings).all()
      : await statement.all();

    const registrations = Array.isArray(result.results) ? result.results : [];

    return jsonResponse({
      registrations,
      counts: countStatuses(registrations)
    }, 200, noStoreHeaders());
  } catch (error) {
    return databaseQueryErrorResponse(error);
  }
}

export async function onRequestPost(context) {
  const db = getDatabase(context);
  if (!db) return databaseMissingResponse();

  const body = await readJsonBody(context.request);
  if (!body) {
    return jsonResponse({ error: '入力内容を読み取れませんでした。' }, 400);
  }

  if (typeof body.website === 'string' && body.website.trim()) {
    return jsonResponse({ error: '送信内容を確認できませんでした。' }, 400);
  }

  const eventId = normalizeEventId(body.eventId);
  const event = eventId ? EVENTS[eventId] : null;
  const battleTag = normalizeBattleTag(body.battleTag ?? body.btag);
  const xAccount = normalizeXAccount(body.xAccount ?? body.twitter);

  if (!event) {
    return jsonResponse({ error: '受付対象ではない日程です。' }, 400);
  }

  if (!battleTag) {
    return jsonResponse({ error: 'BattleTagを「Name#1234」の形式で入力してください。' }, 400);
  }

  if (!xAccount) {
    return jsonResponse({ error: 'Xアカウントを「@username」の形式で入力してください。' }, 400);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const applicationCode = createApplicationCode(id);
  const eventLabel = `${event.label} ${event.schedule}`;

  try {
    await db.prepare(`
      INSERT INTO scrim_registrations (
        id,
        application_code,
        event_id,
        event_label,
        battle_tag,
        battle_tag_normalized,
        x_account,
        x_account_normalized,
        status,
        admin_note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)
    `).bind(
      id,
      applicationCode,
      eventId,
      eventLabel,
      battleTag.display,
      battleTag.normalized,
      xAccount.display,
      xAccount.normalized,
      now,
      now
    ).run();
  } catch (error) {
    if (isConstraintError(error)) {
      return jsonResponse({
        error: 'この日程には、同じBattleTagまたはXアカウントですでに申請されています。',
        code: 'duplicate_registration'
      }, 409);
    }

    return databaseQueryErrorResponse(error, '参加申請を保存できませんでした。');
  }

  return jsonResponse({
    result: 'success',
    applicationCode,
    eventId,
    eventLabel,
    status: 'pending'
  }, 201, noStoreHeaders());
}

export async function onRequestPatch(context) {
  const authError = authorizeAdmin(context);
  if (authError) return authError;

  const db = getDatabase(context);
  if (!db) return databaseMissingResponse();

  const body = await readJsonBody(context.request);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  const status = normalizeStatus(body?.status);
  const adminNote = normalizeAdminNote(body?.adminNote);

  if (!id) {
    return jsonResponse({ error: '変更する申請を特定できませんでした。' }, 400);
  }

  if (!status) {
    return jsonResponse({ error: '申請状態が正しくありません。' }, 400);
  }

  const now = new Date().toISOString();

  try {
    const result = await db.prepare(`
      UPDATE scrim_registrations
      SET status = ?, admin_note = ?, updated_at = ?
      WHERE id = ?
    `).bind(status, adminNote, now, id).run();

    if (!result.meta?.changes) {
      return jsonResponse({ error: '対象の申請が見つかりませんでした。' }, 404);
    }

    const updated = await findRegistrationById(db, id);
    return jsonResponse({ registration: updated }, 200, noStoreHeaders());
  } catch (error) {
    return databaseQueryErrorResponse(error, '申請状態を更新できませんでした。');
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
    return jsonResponse({ error: '削除する申請を特定できませんでした。' }, 400);
  }

  try {
    const result = await db.prepare(
      'DELETE FROM scrim_registrations WHERE id = ?'
    ).bind(id).run();

    if (!result.meta?.changes) {
      return jsonResponse({ error: '対象の申請が見つかりませんでした。' }, 404);
    }

    return jsonResponse({ result: 'success' }, 200, noStoreHeaders());
  } catch (error) {
    return databaseQueryErrorResponse(error, '申請を削除できませんでした。');
  }
}

function getDatabase(context) {
  return context.env.SCRIM_DB || null;
}

function databaseMissingResponse() {
  return jsonResponse({
    error: 'D1データベースが設定されていません。Cloudflare PagesのD1 BindingにSCRIM_DBを設定してください。',
    code: 'database_not_configured'
  }, 503);
}

function databaseQueryErrorResponse(error, fallbackMessage = '申請データを読み込めませんでした。') {
  const message = String(error?.message || error || '');
  console.error('Scrim registration database error', error);

  if (message.toLowerCase().includes('no such table')) {
    return jsonResponse({
      error: 'D1の初期化が完了していません。migrations/0001_scrim_registrations.sqlを実行してください。',
      code: 'database_not_initialized'
    }, 503);
  }

  return jsonResponse({ error: fallbackMessage }, 500);
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

function normalizeEventId(value) {
  if (typeof value !== 'string') return null;
  const eventId = value.trim();
  return Object.hasOwn(EVENTS, eventId) ? eventId : null;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return null;
  const status = value.trim();
  return ALLOWED_STATUSES.has(status) ? status : null;
}

function normalizeBattleTag(value) {
  if (typeof value !== 'string') return null;
  const display = value.trim().replace(/＃/g, '#');
  if (!/^[^#\r\n]{1,30}#[0-9]{4,10}$/u.test(display)) return null;

  return {
    display,
    normalized: display.toLocaleLowerCase('en-US')
  };
}

function normalizeXAccount(value) {
  if (typeof value !== 'string') return null;
  let username = value.trim();

  username = username
    .replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');

  if (!/^[A-Za-z0-9_]{1,20}$/.test(username)) return null;

  return {
    display: `@${username}`,
    normalized: username.toLocaleLowerCase('en-US')
  };
}

function normalizeAdminNote(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 500);
}

function createApplicationCode(id) {
  return `SCRIM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function isConstraintError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('constraint') || message.includes('unique');
}

async function findRegistrationById(db, id) {
  return db.prepare(`
    SELECT
      id,
      application_code AS applicationCode,
      event_id AS eventId,
      event_label AS eventLabel,
      battle_tag AS battleTag,
      x_account AS xAccount,
      status,
      admin_note AS adminNote,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM scrim_registrations
    WHERE id = ?
  `).bind(id).first();
}

function countStatuses(registrations) {
  const counts = {
    total: registrations.length,
    pending: 0,
    accepted: 0,
    waitlisted: 0,
    cancelled: 0,
    rejected: 0
  };

  registrations.forEach((registration) => {
    if (Object.hasOwn(counts, registration.status)) {
      counts[registration.status] += 1;
    }
  });

  return counts;
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
