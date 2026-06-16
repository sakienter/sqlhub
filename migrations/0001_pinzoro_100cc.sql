CREATE TABLE IF NOT EXISTS pinzoro_sessions (
  token TEXT PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 3,
  rolls INTEGER NOT NULL DEFAULT 0,
  last_roll INTEGER,
  streak INTEGER NOT NULL DEFAULT 0,
  one_streak INTEGER NOT NULL DEFAULT 0,
  history TEXT NOT NULL DEFAULT '[]',
  cleared INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pinzoro_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL DEFAULT 'PLAYER',
  rolls INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pinzoro_scores_rank
  ON pinzoro_scores (rolls ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_pinzoro_sessions_updated
  ON pinzoro_sessions (updated_at);
