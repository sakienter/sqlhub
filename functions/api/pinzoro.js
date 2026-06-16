const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

const cleanName = (value) => {
  const name = String(value || '').trim().replace(/[<>]/g, '').slice(0, 12);
  return name || 'PLAYER';
};

const createToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const rollDie = () => {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return (bytes[0] % 6) + 1;
};

async function getRanking(db) {
  const result = await db.prepare(`
    SELECT player_name AS name, rolls, coins, created_at AS createdAt
    FROM pinzoro_scores
    ORDER BY rolls ASC, created_at ASC
    LIMIT 10
  `).all();
  return result.results || [];
}

async function startGame(db) {
  const token = createToken();
  const now = Date.now();
  await db.prepare(`
    INSERT INTO pinzoro_sessions
      (token, coins, rolls, last_roll, streak, one_streak, history, cleared, created_at, updated_at)
    VALUES (?, 3, 0, NULL, 0, 0, '[]', 0, ?, ?)
  `).bind(token, now, now).run();

  return { token, coins: 3, rolls: 0, history: [], cleared: false };
}

async function rollGame(db, token) {
  const row = await db.prepare(`
    SELECT token, coins, rolls, last_roll, streak, one_streak, history, cleared
    FROM pinzoro_sessions
    WHERE token = ?
  `).bind(token).first();

  if (!row) return { error: 'SESSION_NOT_FOUND', status: 404 };
  if (row.cleared) return { error: 'GAME_ALREADY_CLEARED', status: 409 };
  if (row.coins < 1) return { error: 'NO_COINS', status: 409 };

  const result = rollDie();
  const streak = row.last_roll === result ? row.streak + 1 : 1;
  let oneStreak = result === 1 ? row.one_streak + 1 : 0;
  let gained = result;
  let bonus = 0;
  let pinzoroBonus = 0;

  if (streak >= 2) {
    bonus = result;
    gained += bonus;
  }

  if (oneStreak >= 3) {
    pinzoroBonus = 50;
    gained += pinzoroBonus;
    oneStreak = 0;
  }

  const coins = row.coins - 1 + gained;
  const rolls = row.rolls + 1;
  const history = [...JSON.parse(row.history || '[]'), result].slice(-100);
  const cleared = coins >= 100 ? 1 : 0;
  const now = Date.now();

  await db.prepare(`
    UPDATE pinzoro_sessions
    SET coins = ?, rolls = ?, last_roll = ?, streak = ?, one_streak = ?, history = ?, cleared = ?, updated_at = ?
    WHERE token = ?
  `).bind(coins, rolls, result, streak, oneStreak, JSON.stringify(history), cleared, now, token).run();

  if (cleared) {
    await db.prepare(`
      INSERT OR IGNORE INTO pinzoro_scores
        (session_token, player_name, rolls, coins, created_at)
      VALUES (?, 'PLAYER', ?, ?, ?)
    `).bind(token, rolls, coins, now).run();
  }

  return {
    result,
    gained,
    bonus,
    pinzoroBonus,
    coins,
    rolls,
    history,
    cleared: Boolean(cleared),
  };
}

async function submitName(db, token, rawName) {
  const session = await db.prepare(`
    SELECT cleared FROM pinzoro_sessions WHERE token = ?
  `).bind(token).first();

  if (!session) return { error: 'SESSION_NOT_FOUND', status: 404 };
  if (!session.cleared) return { error: 'GAME_NOT_CLEARED', status: 409 };

  const name = cleanName(rawName);
  await db.prepare(`
    UPDATE pinzoro_scores SET player_name = ? WHERE session_token = ?
  `).bind(name, token).run();

  return { ok: true, ranking: await getRanking(db) };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 500);

  try {
    if (request.method === 'GET') {
      return json({ ranking: await getRanking(env.DB) });
    }

    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === 'start') return json(await startGame(env.DB), 201);
    if (action === 'roll') {
      const result = await rollGame(env.DB, String(body.token || ''));
      return result.error ? json({ error: result.error }, result.status) : json(result);
    }
    if (action === 'submit') {
      const result = await submitName(env.DB, String(body.token || ''), body.name);
      return result.error ? json({ error: result.error }, result.status) : json(result);
    }

    return json({ error: 'INVALID_ACTION' }, 400);
  } catch (error) {
    console.error('Pin-Zoro API error', error);
    return json({ error: 'INTERNAL_ERROR' }, 500);
  }
}
