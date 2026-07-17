-- ============================================================
-- AssureCars — Migration 002: Complete Inspection Data Capture
-- ------------------------------------------------------------
-- Purpose
--   The v1 baseline (001) normalized only the inspection *summary*
--   (vehicle snapshot, final assessment, category ratings, valuation,
--   PDF file) and archived the full body in inspection_reports.raw_payload.
--
--   This migration persists the *complete* inspection data emitted by the
--   Inspection App — per-photo images + metadata, manual annotations, AI
--   findings, the full checklist responses, damage assessments, scores,
--   and integrity signals — as first-class, queryable tables.
--
--   Every inspection remains keyed to a vehicle by VIN
--   (inspection_report_vehicles.vin); this migration adds the VIN index
--   and helper that back the "list a car by VIN → auto-map inspection"
--   admin flow.
--
-- Notes
--   * App-originated vocabularies (capture_state, quality, damage type /
--     severity / source, checklist status) are stored as TEXT rather than
--     PG ENUMs so the anti-corruption layer can absorb new values without
--     a schema change. Only mapped fields are normalized; the untouched
--     body still lives in inspection_reports.raw_payload.
--   * Forward-only. Safe to run once after 001_initial_schema.sql.
-- ============================================================

-- -------------------- REPORT DETAIL (1:1) --------------------
-- Inspector, device, GPS, timing, aggregate scores, damage summary,
-- and data-integrity signals for a single report.

CREATE TABLE inspection_report_details (
  inspection_report_id     UUID PRIMARY KEY REFERENCES inspection_reports(id) ON DELETE CASCADE,
  inspector_external_id    VARCHAR(80),
  inspector_name           VARCHAR(200),
  created_at_utc           TIMESTAMPTZ,          -- inspectionTime.createdAt
  completed_at_utc         TIMESTAMPTZ,          -- inspectionTime.completedAt
  gps_lat                  NUMERIC(10, 7),
  gps_lng                  NUMERIC(10, 7),
  device_model             VARCHAR(150),
  device_os_version        VARCHAR(80),
  device_app_version       VARCHAR(40),
  overall_condition        VARCHAR(50),
  inspector_notes          TEXT,
  final_recommendation     VARCHAR(50),
  inspection_status        VARCHAR(30),          -- DRAFT | IN_PROGRESS | COMPLETED | SYNCED
  -- Aggregate scores (0–100)
  exterior_score           SMALLINT,
  interior_score           SMALLINT,
  safety_score             SMALLINT,
  cosmetic_score           SMALLINT,
  confidence_score         SMALLINT,
  -- Damage summary
  damage_total_count       INTEGER NOT NULL DEFAULT 0,
  damage_low_count         INTEGER NOT NULL DEFAULT 0,
  damage_medium_count      INTEGER NOT NULL DEFAULT 0,
  damage_high_count        INTEGER NOT NULL DEFAULT 0,
  damage_critical_count    INTEGER NOT NULL DEFAULT 0,
  -- Integrity signals
  integrity_potential_fraud   BOOLEAN NOT NULL DEFAULT FALSE,
  integrity_missing_images    TEXT[] NOT NULL DEFAULT '{}',
  integrity_duplicate_images  TEXT[] NOT NULL DEFAULT '{}',
  integrity_low_quality_images TEXT[] NOT NULL DEFAULT '{}',
  integrity_suspicious_images TEXT[] NOT NULL DEFAULT '{}'
);

-- -------------------- CHECKLIST RESPONSES --------------------
-- Flattened 200-point checklist: one row per answered item, retaining
-- its section grouping. Item-level photos live in inspection_report_images
-- (linked via checklist_item_id).

CREATE TABLE inspection_checklist_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_report_id   UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  section_id             VARCHAR(120) NOT NULL,
  section_title          VARCHAR(200),
  item_id                VARCHAR(120) NOT NULL,
  label                  VARCHAR(300),
  status                 VARCHAR(40),            -- OK | NOT_OK | PASS | FAIL | ...
  rating                 SMALLINT,               -- 1..5 where applicable
  numeric_value          DOUBLE PRECISION,
  unit                   VARCHAR(40),
  text_value             TEXT,
  damage_types           TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (inspection_report_id, item_id)
);

CREATE INDEX idx_checklist_items_report
  ON inspection_checklist_items (inspection_report_id, section_id);

-- -------------------- INSPECTION IMAGES --------------------
-- Every photo/video captured, whether tagged to a checklist item or a
-- top-level position. imageId from the app is the natural key within a report.

CREATE TABLE inspection_report_images (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_report_id   UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  external_image_id      VARCHAR(120) NOT NULL,  -- imageId from the app
  section                VARCHAR(120),
  position               VARCHAR(120),
  checklist_section_id   VARCHAR(120),
  checklist_item_id      VARCHAR(120),
  checklist_item_label   VARCHAR(300),
  document_type          VARCHAR(80),
  capture_state          VARCHAR(40),            -- CAPTURED | SKIPPED | ...
  skip_reason            TEXT,
  media_type             VARCHAR(20) NOT NULL DEFAULT 'IMAGE',  -- IMAGE | VIDEO
  -- Storage: image binaries live in object storage; keys/urls recorded here
  storage_provider       blob_storage_provider,
  storage_bucket         VARCHAR(100),
  storage_key            TEXT,
  image_url              TEXT,
  thumbnail_url          TEXT,
  -- Metadata
  width                  INTEGER,
  height                 INTEGER,
  size_bytes             BIGINT,
  captured_at_utc        TIMESTAMPTZ,
  orientation            SMALLINT,
  quality                VARCHAR(30),
  sha256_hash            CHAR(64),
  UNIQUE (inspection_report_id, external_image_id)
);

CREATE INDEX idx_report_images_report ON inspection_report_images (inspection_report_id);
CREATE INDEX idx_report_images_checklist_item
  ON inspection_report_images (inspection_report_id, checklist_item_id)
  WHERE checklist_item_id IS NOT NULL;

-- -------------------- IMAGE ANNOTATIONS (manual) --------------------

CREATE TABLE inspection_image_annotations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id               UUID NOT NULL REFERENCES inspection_report_images(id) ON DELETE CASCADE,
  inspection_report_id   UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  shape                  VARCHAR(40),            -- RECT | POLYGON | POINT | ...
  geometry               JSONB,                  -- normalized geometry payload
  damage_type            VARCHAR(60),
  severity               VARCHAR(30),            -- LOW | MEDIUM | HIGH | CRITICAL
  comment                TEXT
);

CREATE INDEX idx_image_annotations_image ON inspection_image_annotations (image_id);

-- -------------------- IMAGE AI FINDINGS --------------------

CREATE TABLE inspection_image_ai_findings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id               UUID NOT NULL REFERENCES inspection_report_images(id) ON DELETE CASCADE,
  inspection_report_id   UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  damage_type            VARCHAR(60),
  confidence             REAL,
  severity               VARCHAR(30),
  bbox_x                 REAL,
  bbox_y                 REAL,
  bbox_w                 REAL,
  bbox_h                 REAL,
  repair_recommendation  VARCHAR(60),
  review_required        BOOLEAN NOT NULL DEFAULT FALSE,
  source                 VARCHAR(40)             -- AI | MANUAL | ...
);

CREATE INDEX idx_image_ai_findings_image ON inspection_image_ai_findings (image_id);

-- -------------------- DAMAGE ASSESSMENT (consolidated) --------------------
-- Flat damage list combining AI + manual findings, as rendered in the report.

CREATE TABLE inspection_damage_assessments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_report_id   UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  image_external_id      VARCHAR(120),
  section                VARCHAR(120),
  position               VARCHAR(120),
  checklist_item_id      VARCHAR(120),
  checklist_item         VARCHAR(300),
  source                 VARCHAR(40),            -- AI | MANUAL
  damage_type            VARCHAR(60),
  severity               VARCHAR(30),
  component              VARCHAR(120),
  vehicle_side           VARCHAR(60),
  estimated_size         VARCHAR(60),
  confidence             REAL,
  repair_required        BOOLEAN,
  estimated_cost         NUMERIC(12, 2),
  manual_verified        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_damage_assessments_report ON inspection_damage_assessments (inspection_report_id);

-- -------------------- VIN MAPPING SUPPORT --------------------
-- Back the "auto-map inspection to car by VIN" flow: fast lookup of the
-- vehicle snapshot's VIN so ingestion (car exists) and car creation
-- (report already parked as Unmatched) can correlate in either direction.

CREATE INDEX idx_inspection_report_vehicles_vin
  ON inspection_report_vehicles (vin)
  WHERE vin IS NOT NULL;

-- Helper: link every ingested RESALE report whose vehicle VIN matches a
-- newly created / updated car, and clear its unmatched-queue entry.
-- Called from the Car Catalog service after a car is created with a VIN
-- (see Solution Design §10.2 and §10.14). Returns the number of reports linked.
CREATE OR REPLACE FUNCTION link_inspection_reports_by_vin(p_car_id UUID, p_vin VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  linked_count INTEGER := 0;
BEGIN
  WITH matched AS (
    SELECT ir.id
    FROM inspection_reports ir
    JOIN inspection_report_vehicles irv ON irv.inspection_report_id = ir.id
    WHERE ir.context = 'RESALE'
      AND ir.car_id IS NULL
      AND ir.status IN ('Ingested', 'Unmatched', 'Pass', 'Fail')
      AND upper(irv.vin) = upper(p_vin)
  ),
  upd AS (
    UPDATE inspection_reports ir
    SET car_id = p_car_id
    FROM matched
    WHERE ir.id = matched.id
    RETURNING ir.id
  )
  SELECT count(*) INTO linked_count FROM upd;

  -- Resolve any parked unmatched-queue rows for the reports we just linked.
  UPDATE inspection_unmatched_queue q
  SET resolved_at = now(), resolved_car_id = p_car_id
  FROM inspection_reports ir
  WHERE q.inspection_report_id = ir.id
    AND ir.car_id = p_car_id
    AND q.resolved_at IS NULL;

  -- Point the car at its most recent linked report.
  UPDATE cars c
  SET current_inspection_report_id = (
    SELECT ir.id FROM inspection_reports ir
    WHERE ir.car_id = p_car_id
    ORDER BY ir.ingested_at DESC
    LIMIT 1
  )
  WHERE c.id = p_car_id
    AND EXISTS (SELECT 1 FROM inspection_reports ir WHERE ir.car_id = p_car_id);

  RETURN linked_count;
END;
$$ LANGUAGE plpgsql;
