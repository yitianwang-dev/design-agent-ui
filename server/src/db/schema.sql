CREATE TABLE IF NOT EXISTS jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status      TEXT NOT NULL DEFAULT 'pending',
  user_id     TEXT NOT NULL,
  input       JSONB NOT NULL,
  output_js   TEXT,
  error       TEXT,
  figma_node  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status: 'pending' | 'processing' | 'done' | 'error'
