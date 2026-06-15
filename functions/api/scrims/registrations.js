const STATUSES = new Set(['pending','accepted','waitlisted','cancelled','rejected']);
const DEFAULT_EVENTS = [
  ['2026-06-18','21:00','20:30'],
  ['2026-06-19','21:00','20:30']
];

export async function onRequestGet(context) {
  const auth = authorize(context);
  if (auth) return auth;
  const db = context.env.SCRIM_DB;
  if (!db) return missingDb();

  const url = new URL(context.request.url);
  const eventId = validDate(url.searchParams.get('eventId'));
  const status = validStatus(url.searchParams.get('status'));
  const where = [];
  const values = [];
  if (eventId) { where.push('event_id = ?'); values.push(eventId); }
  if (status) { where.push('status = ?'); values.push(status); }

  try {
    const sql = `SELECT id, application_code AS applicationCode, event_id AS eventId,
      event_label AS eventLabel, battle_tag AS battleTag, x_account AS xAccount,
      status, admin_note AS adminNote, created_at AS createdAt, updated_at AS updatedAt
      FROM scrim_registrations ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY event_id ASC, created_at ASC`;
    const stmt = db.prepare(sql);
    const result = values.length ? await stmt.bind(...values).all() : await stmt.all();
    const registrations = Array.isArray(result.results) ? result.results : [];
    return json({ registrations, counts: countStatuses(registrations) }, 200);
  } catch (error) {
    return dbError(error, '申請データを読み込めませんでした。');
  }
}

export async function onRequestPost(context) {
  const db = context.env.SCRIM_DB;
  if (!db) return missingDb();
  const body = await readBody(context.request);
  if (!body) return json({ error: '入力内容を読み取れませんでした。' }, 400);
  if (typeof body.website === 'string' && body.website.trim()) {
    return json({ error: '送信内容を確認できませんでした。' }, 400);
  }

  const eventId = validDate(body.eventId);
  const battleTag = normalizeBattleTag(body.battleTag ?? body.btag);
  const xAccount = normalizeX(body.xAccount ?? body.twitter);
  if (!eventId) return json({ error: '受付対象ではない日程です。' }, 400);
  if (!battleTag) return json({ error: 'BattleTagを「Name#1234」の形式で入力してください。' }, 400);
  if (!xAccount) return json({ error: 'Xアカウントを「@username」の形式で入力してください。' }, 400);

  try {
    await ensureEvents(db);
    const event = await db.prepare(`SELECT id, event_date AS eventDate,
      start_time AS startTime, status FROM scrim_events WHERE id = ?`).bind(eventId).first();
    if (!event || event.status !== 'open') {
      return json({ error: 'この日程は現在参加申請を受け付けていません。' }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const applicationCode = `SCRIM-${id.replace(/-/g,'').slice(0,8).toUpperCase()}`;
    const eventLabel = displayLabel(event.eventDate, event.startTime);

    await db.prepare(`INSERT INTO scrim_registrations (
      id, application_code, event_id, event_label,
      battle_tag, battle_tag_normalized, x_account, x_account_normalized,
      status, admin_note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`)
      .bind(id, applicationCode, eventId, eventLabel,
        battleTag.display, battleTag.normalized, xAccount.display, xAccount.normalized,
        now, now).run();

    return json({ result:'success', applicationCode, eventId, eventLabel, status:'pending' }, 201);
  } catch (error) {
    const message = String(error?.message || error || '').toLowerCase();
    if (message.includes('constraint') || message.includes('unique')) {
      return json({ error:'この日程には、同じBattleTagまたはXアカウントですでに申請されています。', code:'duplicate_registration' }, 409);
    }
    return dbError(error, '参加申請を保存できませんでした。');
  }
}

export async function onRequestPatch(context) {
  const auth = authorize(context);
  if (auth) return auth;
  const db = context.env.SCRIM_DB;
  if (!db) return missingDb();
  const body = await readBody(context.request);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  const status = validStatus(body?.status);
  const note = typeof body?.adminNote === 'string' ? body.adminNote.trim().slice(0,500) : '';
  if (!id) return json({ error:'変更する申請を特定できませんでした。' },400);
  if (!status) return json({ error:'申請状態が正しくありません。' },400);

  try {
    const result = await db.prepare(`UPDATE scrim_registrations
      SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?`)
      .bind(status, note, new Date().toISOString(), id).run();
    if (!result.meta?.changes) return json({ error:'対象の申請が見つかりませんでした。' },404);
    return json({ result:'success' },200);
  } catch (error) {
    return dbError(error, '申請状態を更新できませんでした。');
  }
}

export async function onRequestDelete(context) {
  const auth = authorize(context);
  if (auth) return auth;
  const db = context.env.SCRIM_DB;
  if (!db) return missingDb();
  const body = await readBody(context.request);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) return json({ error:'削除する申請を特定できませんでした。' },400);

  try {
    const result = await db.prepare('DELETE FROM scrim_registrations WHERE id = ?').bind(id).run();
    if (!result.meta?.changes) return json({ error:'対象の申請が見つかりませんでした。' },404);
    return json({ result:'success' },200);
  } catch (error) {
    return dbError(error, '申請を削除できませんでした。');
  }
}

async function ensureEvents(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS scrim_events (
    id TEXT PRIMARY KEY, event_date TEXT NOT NULL UNIQUE,
    start_time TEXT NOT NULL, gather_time TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  const now = new Date().toISOString();
  for (const [date,start,gather] of DEFAULT_EVENTS) {
    await db.prepare(`INSERT OR IGNORE INTO scrim_events
      (id,event_date,start_time,gather_time,status,created_at,updated_at)
      VALUES (?,?,?,?,'open',?,?)`).bind(date,date,start,gather,now,now).run();
  }
}

function displayLabel(value,time) {
  const date = parseDate(value);
  if (!date) return `${value} ${time} 開始`;
  const days = ['日','月','火','水','木','金','土'];
  return `${date.getUTCMonth()+1}月${date.getUTCDate()}日（${days[date.getUTCDay()]}）${time} 開始`;
}
function parseDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));
  return date.getUTCFullYear()===Number(m[1]) && date.getUTCMonth()===Number(m[2])-1 && date.getUTCDate()===Number(m[3]) ? date : null;
}
function validDate(value) { return typeof value === 'string' && parseDate(value.trim()) ? value.trim() : null; }
function validStatus(value) { return typeof value === 'string' && STATUSES.has(value.trim()) ? value.trim() : null; }
function normalizeBattleTag(value) {
  if (typeof value !== 'string') return null;
  const display = value.trim().replace(/＃/g,'#');
  if (!/^[^#\r\n]{1,30}#[0-9]{4,10}$/u.test(display)) return null;
  return { display, normalized:display.toLowerCase() };
}
function normalizeX(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i,'').replace(/^@/,'').replace(/[/?#].*$/,'');
  if (!/^[A-Za-z0-9_]{1,20}$/.test(name)) return null;
  return { display:`@${name}`, normalized:name.toLowerCase() };
}
function authorize(context) {
  const expected = context.env.SCRIM_ADMIN_TOKEN;
  if (!expected) return json({ error:'管理用パスワードが設定されていません。' },503);
  return context.request.headers.get('Authorization') === `Bearer ${expected}` ? null : json({ error:'管理用パスワードが正しくありません。' },401);
}
function countStatuses(items) {
  const counts = { total:items.length,pending:0,accepted:0,waitlisted:0,cancelled:0,rejected:0 };
  items.forEach(item => { if (Object.hasOwn(counts,item.status)) counts[item.status] += 1; });
  return counts;
}
async function readBody(request) { try { return await request.json(); } catch { return null; } }
function missingDb() { return json({ error:'D1データベースが設定されていません。', code:'database_not_configured' },503); }
function dbError(error,message) { console.error('Scrim registration database error',error); return json({ error:message },500); }
function json(data,status) { return new Response(JSON.stringify(data),{ status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0'} }); }
