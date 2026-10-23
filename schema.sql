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

-- Gallery photos. Images live in R2 (binding PHOTOS); this is their metadata.
CREATE TABLE IF NOT EXISTS photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  before_key  TEXT NOT NULL,
  after_key   TEXT NOT NULL,
  caption     TEXT,
  town        TEXT,
  alt_before  TEXT,
  alt_after   TEXT,
  published   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_photos_pub ON photos (published, sort_order);

-- Customer reviews. Nothing shows on the site until status = 'approved'.
CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  town        TEXT,
  body        TEXT NOT NULL,
  rating      INTEGER,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | hidden
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status, created_at DESC);
