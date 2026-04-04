CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  image TEXT DEFAULT '',
  pub_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);

CREATE TABLE IF NOT EXISTS live_streams (
  label TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL
);

-- Seed live streams
INSERT OR REPLACE INTO live_streams (label, channel_id, video_id) VALUES
  ('الجزيرة', 'UCfiwzLy-8yKzIbsmZTzxDgw', 'bNyUyrR0PHo'),
  ('الحدث', 'UCrj5BGAhtWxDfqbza9T9hqA', 'xWXpl7azI8k');
