-- Fireplace Facelifts — D1 schema
-- Already applied to database "fireplace-facelifts".
-- Kept here so the schema lives in version control.

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  city       TEXT,
  project    TEXT,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new',   -- 'new' | 'answered'
  is_test    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at DESC);

CREATE TABLE IF NOT EXISTS replies (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id      INTEGER NOT NULL,
  body            TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',  -- 'sent' | 'failed'
  provider_id     TEXT,
  error           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_replies_message ON replies (message_id);
