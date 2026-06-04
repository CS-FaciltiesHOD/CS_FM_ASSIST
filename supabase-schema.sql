-- ═══════════════════════════════════════════════════════════════════════════
-- FM ASSIST V2 — SUPABASE DATABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → paste → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- CORE TICKETS TABLE
-- One row per fault report. Every field from Layer 11 (Report Generation)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (

  -- Identity
  id                  BIGSERIAL PRIMARY KEY,
  ticket_id           TEXT        NOT NULL UNIQUE,   -- e.g. FM-LX2P4-A3K
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Layer 1 — Identification
  store               TEXT        NOT NULL,
  reporter            TEXT        NOT NULL,
  category            TEXT        NOT NULL,          -- Refrigeration, Electrical, etc.
  equipment           TEXT        NOT NULL,          -- Cold Room, Bandsaw, etc.
  location            TEXT        NOT NULL,          -- Aisle 3, Bakery, Loading Bay
  brand               TEXT,
  model               TEXT,
  asset_tag           TEXT,
  serial_number       TEXT,

  -- Layer 3 — Asset Classification
  criticality         TEXT        CHECK (criticality IN ('Critical','Important','Routine')),

  -- Layer 4 — Power Check
  power_status        TEXT,                          -- Confirmed / Restored / Electrical fault

  -- Layer 5 — Fault Type
  fault_type          TEXT,                          -- Not Cooling, No Power, Leak, etc.

  -- Layer 2 — Safety Assessment
  safety_risk         TEXT,                          -- No risk / Staff at risk / etc.
  emergency_type      TEXT,                          -- Fire, Flooding, None, etc.

  -- Layer 8 — Operational Impact
  operational_impact  TEXT,                          -- No Impact / Trading Stopped / etc.

  -- Layer 9 — Priority
  priority            TEXT        NOT NULL DEFAULT 'Routine',
  priority_level      SMALLINT    NOT NULL DEFAULT 4  CHECK (priority_level BETWEEN 1 AND 4),
  sla                 TEXT        NOT NULL,           -- 1 Hour / 4 Hours / 24 Hours / Next slot

  -- Layer 10 — Service Provider
  service_provider    TEXT        NOT NULL,

  -- Layer 15 — Decision Engine
  outcome             TEXT,                           -- Monitor / Store Action / Technician / Emergency
  technician_required BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Media
  photo_attached      BOOLEAN     NOT NULL DEFAULT FALSE,
  photo_urls          TEXT[],                         -- Array of storage URLs

  -- Status lifecycle
  status              TEXT        NOT NULL DEFAULT 'Open'
                      CHECK (status IN ('Open','Assigned','In Progress','Pending Parts','Closed','Cancelled')),
  assigned_to         TEXT,                           -- Technician name or contractor
  notes               TEXT,
  closed_at           TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for common queries
CREATE INDEX idx_tickets_store          ON tickets (store);
CREATE INDEX idx_tickets_status         ON tickets (status);
CREATE INDEX idx_tickets_priority_level ON tickets (priority_level);
CREATE INDEX idx_tickets_provider       ON tickets (service_provider);
CREATE INDEX idx_tickets_created_at     ON tickets (created_at DESC);
CREATE INDEX idx_tickets_category       ON tickets (category);


-- ─────────────────────────────────────────────────────────────────────────────
-- DIAGNOSTIC FINDINGS
-- One row per diagnostic question answered (Layer 6)
-- Stored separately for flexible reporting and analytics
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_findings (
  id            BIGSERIAL   PRIMARY KEY,
  ticket_id     TEXT        NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  finding_key   TEXT        NOT NULL,   -- e.g. C_TEMP, R_FANS, BU_GUARDS
  finding_value TEXT        NOT NULL,   -- e.g. "+6°C", "None spinning", "Yes"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_ticket_id ON ticket_findings (ticket_id);
CREATE INDEX idx_findings_key       ON ticket_findings (finding_key);


-- ─────────────────────────────────────────────────────────────────────────────
-- FOOD SAFETY ASSESSMENT
-- One row per ticket where food safety applies (Layer 7)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_food_safety (
  id                      BIGSERIAL   PRIMARY KEY,
  ticket_id               TEXT        NOT NULL UNIQUE REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  cold_chain_compromised  BOOLEAN     NOT NULL DEFAULT FALSE,
  product_above_temp      BOOLEAN     NOT NULL DEFAULT FALSE,
  contamination_risk      BOOLEAN     NOT NULL DEFAULT FALSE,
  production_stopped      BOOLEAN     NOT NULL DEFAULT FALSE,
  stock_at_risk           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ASSETS TABLE
-- Master asset register — every piece of equipment the bot knows about
-- Populated from ASSET_PROFILES in logic-engine.js
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id                  BIGSERIAL   PRIMARY KEY,
  asset_tag           TEXT        UNIQUE,
  equipment_name      TEXT        NOT NULL,
  category            TEXT        NOT NULL,
  diagnostic_profile  TEXT        NOT NULL,
  criticality         TEXT        CHECK (criticality IN ('Critical','Important','Routine')),
  requires_power      BOOLEAN     NOT NULL DEFAULT TRUE,
  power_path          TEXT        CHECK (power_path IN ('A','B','C','D')),
  food_safety         BOOLEAN     NOT NULL DEFAULT FALSE,
  service_provider    TEXT        NOT NULL,
  target_temp_min     NUMERIC,
  target_temp_max     NUMERIC,
  target_temp_unit    TEXT        DEFAULT '°C',
  brand               TEXT,
  model               TEXT,
  serial_number       TEXT,
  store               TEXT,
  location            TEXT,
  notes               TEXT,
  active              BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_category  ON assets (category);
CREATE INDEX idx_assets_store     ON assets (store);
CREATE INDEX idx_assets_active    ON assets (active);


-- ─────────────────────────────────────────────────────────────────────────────
-- STORES TABLE
-- List of all stores / branches
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  region      TEXT,
  address     TEXT,
  manager     TEXT,
  phone       TEXT,
  email       TEXT,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICE PROVIDERS TABLE
-- Contact details for each contractor / provider
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_providers (
  id              BIGSERIAL   PRIMARY KEY,
  name            TEXT        NOT NULL UNIQUE,
  category        TEXT,                     -- which fault category they cover
  contact_name    TEXT,
  phone           TEXT,
  email           TEXT,
  whatsapp        TEXT,
  sla_emergency   TEXT DEFAULT '1 Hour',
  sla_urgent      TEXT DEFAULT '4 Hours',
  sla_high        TEXT DEFAULT '24 Hours',
  sla_routine     TEXT DEFAULT 'Next Slot',
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the provider list from the spec
INSERT INTO service_providers (name, category, sla_emergency, sla_urgent, sla_high, sla_routine) VALUES
  ('Cold Chain',            'Refrigeration',  '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Electrical Contractor', 'Electrical',     '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Generator Contractor',  'Backup Power',   '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Plumbing Services',     'Plumbing',       '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Building Maintenance',  'Building',       '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Workshop Team',         'Trolleys',       '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Bakery Services',       'Bakery',         '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Butchery Technician',   'Butchery',       '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Deli Services',         'Deli',           '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('F&V Team',              'Fruit & Veg',    '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('HVAC Contractor',       'HVAC',           '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Fire Services',         'Fire Safety',    '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('Pest Contractor',       'Pest & Hygiene', '1 Hour', '4 Hours', '24 Hours', 'Next Slot'),
  ('FM Manager',            'General',        '1 Hour', '4 Hours', '24 Hours', 'Next Slot')
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- TICKET STATUS HISTORY
-- Full audit trail of every status change per ticket
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id          BIGSERIAL   PRIMARY KEY,
  ticket_id   TEXT        NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  status      TEXT        NOT NULL,
  changed_by  TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_ticket_id ON ticket_status_history (ticket_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- CHAT SESSIONS TABLE
-- Stores conversation history for WhatsApp, Telegram, and Web users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id            BIGSERIAL   PRIMARY KEY,
  session_id    TEXT        NOT NULL UNIQUE,   -- WhatsApp number / TG chat ID / web UUID
  channel       TEXT        NOT NULL DEFAULT 'web'
                CHECK (channel IN ('whatsapp','telegram','web')),
  store         TEXT,
  reporter      TEXT,
  phase         SMALLINT    NOT NULL DEFAULT 1,  -- current phase (1–6)
  step          TEXT,                             -- current question ID within phase
  state_json    JSONB       NOT NULL DEFAULT '{}', -- full session state
  last_active   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_session_id  ON chat_sessions (session_id);
CREATE INDEX idx_sessions_last_active ON chat_sessions (last_active DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- DASHBOARD VIEWS
-- Pre-built views for the FM manager dashboard
-- ─────────────────────────────────────────────────────────────────────────────

-- Open tickets by priority
CREATE OR REPLACE VIEW v_open_by_priority AS
SELECT
  priority_level,
  priority,
  COUNT(*)            AS count,
  MIN(created_at)     AS oldest_ticket
FROM tickets
WHERE status = 'Open'
GROUP BY priority_level, priority
ORDER BY priority_level;

-- Open tickets by store
CREATE OR REPLACE VIEW v_open_by_store AS
SELECT
  store,
  COUNT(*)                                              AS total_open,
  COUNT(*) FILTER (WHERE priority_level = 1)           AS emergency,
  COUNT(*) FILTER (WHERE priority_level = 2)           AS urgent,
  COUNT(*) FILTER (WHERE priority_level = 3)           AS high,
  COUNT(*) FILTER (WHERE priority_level = 4)           AS routine
FROM tickets
WHERE status = 'Open'
GROUP BY store
ORDER BY emergency DESC, urgent DESC;

-- Open tickets by provider
CREATE OR REPLACE VIEW v_open_by_provider AS
SELECT
  service_provider,
  COUNT(*)                                              AS total_open,
  COUNT(*) FILTER (WHERE priority_level = 1)           AS emergency,
  COUNT(*) FILTER (WHERE priority_level = 2)           AS urgent,
  MIN(created_at)                                       AS oldest_ticket
FROM tickets
WHERE status = 'Open'
GROUP BY service_provider
ORDER BY emergency DESC, urgent DESC;

-- All open tickets with food safety flag
CREATE OR REPLACE VIEW v_tickets_with_food_safety AS
SELECT
  t.*,
  fs.cold_chain_compromised,
  fs.product_above_temp,
  fs.stock_at_risk
FROM tickets t
LEFT JOIN ticket_food_safety fs ON t.ticket_id = fs.ticket_id
WHERE t.status = 'Open'
ORDER BY t.priority_level, t.created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS — public read for open tickets, authenticated write
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tickets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_findings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_food_safety    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions         ENABLE ROW LEVEL SECURITY;

-- Allow service role (server) to do everything
CREATE POLICY "service_role_all_tickets"
  ON tickets FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_findings"
  ON ticket_findings FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_food_safety"
  ON ticket_food_safety FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_assets"
  ON assets FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_stores"
  ON stores FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_providers"
  ON service_providers FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_history"
  ON ticket_status_history FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_sessions"
  ON chat_sessions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Allow anon to read providers and stores (for the widget dropdowns)
CREATE POLICY "anon_read_providers"
  ON service_providers FOR SELECT
  TO anon USING (active = true);

CREATE POLICY "anon_read_stores"
  ON stores FOR SELECT
  TO anon USING (active = true);
