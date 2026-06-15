CREATE TABLE IF NOT EXISTS scrim_registrations (
  id TEXT PRIMARY KEY,
  application_code TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL,
  event_label TEXT NOT NULL,
  battle_tag TEXT NOT NULL,
  battle_tag_normalized TEXT NOT NULL,
  x_account TEXT NOT NULL,
  x_account_normalized TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'waitlisted', 'cancelled', 'rejected')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scrim_registrations_event_battletag
  ON scrim_registrations (event_id, battle_tag_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scrim_registrations_event_x_account
  ON scrim_registrations (event_id, x_account_normalized);

CREATE INDEX IF NOT EXISTS idx_scrim_registrations_event_status_created
  ON scrim_registrations (event_id, status, created_at);
