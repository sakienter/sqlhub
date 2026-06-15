CREATE TABLE IF NOT EXISTS scrim_events (
  id TEXT PRIMARY KEY,
  event_date TEXT NOT NULL UNIQUE,
  start_time TEXT NOT NULL,
  gather_time TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scrim_events_status_date
  ON scrim_events (status, event_date, start_time);

INSERT OR IGNORE INTO scrim_events (
  id,
  event_date,
  start_time,
  gather_time,
  status,
  created_at,
  updated_at
) VALUES
  ('2026-06-18', '2026-06-18', '21:00', '20:30', 'open', datetime('now'), datetime('now')),
  ('2026-06-19', '2026-06-19', '21:00', '20:30', 'open', datetime('now'), datetime('now'));
