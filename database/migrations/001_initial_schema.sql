-- ============================================================
-- AssureCars — Initial Schema (PostgreSQL 15+)
-- Single-tenant per dealer instance
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- -------------------- ENUMS --------------------

CREATE TYPE account_type AS ENUM ('User', 'Employee', 'Admin');
CREATE TYPE auth_client AS ENUM ('UserApp', 'Website', 'EmployeeApp', 'AdminPortal', 'InspectionApp');
CREATE TYPE car_status AS ENUM (
  'Draft', 'InInspection', 'Refurbishing', 'Certified', 'Live', 'Reserved', 'Sold', 'Delisted'
);
CREATE TYPE listing_source AS ENUM ('Owned', 'ConsignedVendor', 'ConsignedIndividual');
CREATE TYPE consignor_type AS ENUM ('Vendor', 'Individual');
CREATE TYPE fuel_type AS ENUM ('Petrol', 'Diesel', 'CNG', 'LPG', 'Electric', 'Hybrid', 'Other');
CREATE TYPE transmission_type AS ENUM ('Manual', 'Automatic', 'AMT', 'CVT', 'DCT', 'Other');
CREATE TYPE body_style AS ENUM (
  'Hatchback', 'Sedan', 'SUV', 'MUV', 'Coupe', 'Convertible', 'Pickup', 'Other'
);
CREATE TYPE vehicle_category AS ENUM ('OLD', 'NEW');
CREATE TYPE inspection_context AS ENUM ('RESALE', 'SELL', 'PDI');
CREATE TYPE inspection_report_status AS ENUM ('Ingested', 'Pass', 'Fail', 'Superseded', 'Unmatched');
CREATE TYPE repair_recommendation AS ENUM ('NO_REPAIR', 'MINOR_REPAIR', 'MAJOR_REPAIR', 'NOT_RECOMMENDED');
CREATE TYPE inspection_request_type AS ENUM ('Sell', 'PDI');
CREATE TYPE pdi_subtype AS ENUM ('NewCar', 'UsedCarOtherDealer');
CREATE TYPE inspection_request_status AS ENUM (
  'Requested', 'Scheduled', 'Inspected', 'ReportReady', 'Closed', 'Cancelled'
);
CREATE TYPE test_drive_mode AS ENUM ('AtHub', 'Doorstep');
CREATE TYPE test_drive_booking_status AS ENUM (
  'Requested', 'Confirmed', 'Reminded', 'EnRoute', 'CheckedIn',
  'InProgress', 'Completed', 'NoShow', 'Cancelled', 'Rescheduled'
);
CREATE TYPE lead_source AS ENUM ('Interest', 'WalkIn', 'Referral', 'SellRequest', 'Other');
CREATE TYPE lead_status AS ENUM (
  'New', 'Contacted', 'Qualified', 'TestDriveScheduled', 'Negotiation', 'Won', 'Lost'
);
CREATE TYPE reservation_status AS ENUM ('Reserved', 'DealInProgress', 'Sold', 'Released', 'Cancelled');
CREATE TYPE media_type AS ENUM ('Photo', 'Video', 'Document');
CREATE TYPE media_purpose AS ENUM ('Listing', 'Inspection', 'TestDrive', 'Other');
CREATE TYPE blob_storage_provider AS ENUM ('Local', 'MinIO', 'S3', 'AzureBlob');

-- -------------------- IDENTITY & RBAC --------------------

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           VARCHAR(20) NOT NULL,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  email           CITEXT,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  full_name       VARCHAR(200),
  account_type    account_type NOT NULL DEFAULT 'User',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_phone UNIQUE (phone)
);

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) NOT NULL UNIQUE,  -- e.g. sales_executive, hub_manager, super_admin
  name        VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE user_roles (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      VARCHAR(128) NOT NULL UNIQUE,
  family_id       UUID NOT NULL,
  account_type    account_type NOT NULL,
  client_id       auth_client NOT NULL,
  allowed_clients auth_client[] NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_credentials (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash         VARCHAR(255) NOT NULL,
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret            VARCHAR(255),
  mfa_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  failed_attempts       SMALLINT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(20) NOT NULL,
  client_id    auth_client NOT NULL,
  otp_hash     VARCHAR(128) NOT NULL,
  attempts     SMALLINT NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ NOT NULL,
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_sessions_phone ON otp_sessions (phone, expires_at DESC);

-- -------------------- DEALER CONFIG --------------------

CREATE TABLE dealer_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_name           VARCHAR(200) NOT NULL,
  logo_url              TEXT,
  primary_domain        VARCHAR(255),
  default_city          VARCHAR(100),
  reservation_hold_hours INT NOT NULL DEFAULT 48,
  grade_thresholds      JSONB NOT NULL DEFAULT '{}',  -- configurable A/B/C cutoffs
  notification_config   JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(80) NOT NULL UNIQUE,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------- CATALOG REFERENCE --------------------

CREATE TABLE makes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE models (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id    UUID NOT NULL REFERENCES makes(id),
  name       VARCHAR(100) NOT NULL,
  body_style body_style,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (make_id, name)
);

-- -------------------- HUBS & STAFF --------------------

CREATE TABLE hubs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(150) NOT NULL,
  address_line  TEXT,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100),
  pincode       VARCHAR(20),
  latitude      NUMERIC(10, 7),
  longitude     NUMERIC(10, 7),
  phone         VARCHAR(20),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id),
  employee_code   VARCHAR(50) UNIQUE,
  designation     VARCHAR(100),
  is_field_agent  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employee_hubs (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  hub_id      UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (employee_id, hub_id)
);

CREATE TABLE hub_slot_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id                UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  name                  VARCHAR(100) NOT NULL DEFAULT 'Default',
  operating_days        SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6}',  -- ISO dow Mon=1
  open_time_local       TIME NOT NULL DEFAULT '09:00',
  close_time_local      TIME NOT NULL DEFAULT '19:00',
  test_drive_duration_min SMALLINT NOT NULL DEFAULT 20,
  buffer_min            SMALLINT NOT NULL DEFAULT 0,
  default_capacity      SMALLINT NOT NULL DEFAULT 3,
  timezone              VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------- CONSIGNORS --------------------

CREATE TABLE consignors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        consignor_type NOT NULL,
  name        VARCHAR(200) NOT NULL,
  phone       VARCHAR(20),
  email       CITEXT,
  company     VARCHAR(200),
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------- INVENTORY (CARS) --------------------

CREATE TABLE cars (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin                     VARCHAR(40) NOT NULL,
  registration_number     VARCHAR(30),
  model_id                UUID REFERENCES models(id),
  hub_id                  UUID REFERENCES hubs(id),
  listing_source          listing_source NOT NULL DEFAULT 'Owned',
  consignor_id            UUID REFERENCES consignors(id),
  status                  car_status NOT NULL DEFAULT 'Draft',
  year                    SMALLINT,
  odometer_km             INTEGER,
  fuel_type               fuel_type,
  transmission            transmission_type,
  body_style              body_style,
  color                   VARCHAR(60),
  number_of_owners        SMALLINT,
  number_of_keys          SMALLINT,
  engine_number           VARCHAR(60),
  chassis_number          VARCHAR(60),
  list_price_paise        BIGINT,           -- INR stored as paise (₹1 = 100 paise)
  emi_from_paise          BIGINT,
  td_capacity_per_slot    SMALLINT NOT NULL DEFAULT 1,
  current_inspection_report_id UUID,       -- FK added after inspection_reports exists
  certified_at            TIMESTAMPTZ,
  published_at            TIMESTAMPTZ,
  sold_at                 TIMESTAMPTZ,
  row_version             BIGINT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_consigned_requires_consignor CHECK (
    listing_source = 'Owned' OR consignor_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX uq_cars_vin_active
  ON cars (vin)
  WHERE status NOT IN ('Sold', 'Delisted');

CREATE INDEX idx_cars_status_hub ON cars (status, hub_id);
CREATE INDEX idx_cars_list_price ON cars (list_price_paise) WHERE status = 'Live';

CREATE TABLE car_features (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id      UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  feature     VARCHAR(120) NOT NULL,
  UNIQUE (car_id, feature)
);

CREATE TABLE car_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id          UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  media_type      media_type NOT NULL DEFAULT 'Photo',
  purpose         media_purpose NOT NULL DEFAULT 'Listing',
  storage_key     TEXT NOT NULL,
  url             TEXT,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------- INSPECTION REPORTS (from external app) --------------------

CREATE TABLE inspection_reports (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_report_id       UUID NOT NULL UNIQUE,      -- reportId from Inspection App
  external_inspection_id   UUID NOT NULL UNIQUE,      -- inspectionId from Inspection App
  context                  inspection_context NOT NULL,
  car_id                   UUID REFERENCES cars(id),
  inspection_request_id    UUID,                      -- FK added after inspection_requests
  status                   inspection_report_status NOT NULL DEFAULT 'Ingested',
  inspected_at             TIMESTAMPTZ,
  ingested_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_by_id         UUID REFERENCES inspection_reports(id),
  raw_payload              JSONB NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspection_reports_car ON inspection_reports (car_id) WHERE car_id IS NOT NULL;
CREATE INDEX idx_inspection_reports_context ON inspection_reports (context, ingested_at DESC);

CREATE TABLE inspection_report_vehicles (
  inspection_report_id   UUID PRIMARY KEY REFERENCES inspection_reports(id) ON DELETE CASCADE,
  vin                    VARCHAR(40),
  registration_number    VARCHAR(30),
  category               vehicle_category,
  year                   SMALLINT,
  manufacturer           VARCHAR(100),
  make                   VARCHAR(100),
  model                  VARCHAR(100),
  variant                VARCHAR(100),
  trim                   VARCHAR(100),
  body_style             body_style,
  fuel_type              fuel_type,
  transmission           transmission_type,
  color                  VARCHAR(60),
  engine_number          VARCHAR(60),
  chassis_number         VARCHAR(60),
  odometer_km            INTEGER,
  number_of_ownerships   SMALLINT,
  number_of_keys         SMALLINT
);

CREATE TABLE inspection_final_assessments (
  inspection_report_id UUID PRIMARY KEY REFERENCES inspection_reports(id) ON DELETE CASCADE,
  overall_condition    VARCHAR(50),
  recommendation       repair_recommendation NOT NULL,
  remarks              TEXT
);

CREATE TABLE inspection_category_ratings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_report_id UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  category             VARCHAR(50) NOT NULL,   -- Exterior, Interior, Engine, ...
  rating               SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  UNIQUE (inspection_report_id, category)
);

CREATE TABLE inspection_valuations (
  inspection_report_id UUID PRIMARY KEY REFERENCES inspection_reports(id) ON DELETE CASCADE,
  overall_score        SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  condition_band       VARCHAR(30),
  benchmark_score      SMALLINT,
  delta_vs_typical     SMALLINT,
  market_position      VARCHAR(60),
  verdict              TEXT,
  price_guidance       TEXT,
  damage_count         INTEGER NOT NULL DEFAULT 0,
  derived_grade        VARCHAR(5)              -- A, A-, B+, ... computed at ingest
);

CREATE TABLE inspection_report_files (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_report_id UUID NOT NULL UNIQUE REFERENCES inspection_reports(id) ON DELETE CASCADE,
  storage_provider     blob_storage_provider NOT NULL DEFAULT 'MinIO',
  storage_bucket       VARCHAR(100) NOT NULL,
  storage_key          TEXT NOT NULL,
  file_name            VARCHAR(255) NOT NULL,
  mime_type            VARCHAR(80) NOT NULL DEFAULT 'application/pdf',
  file_size_bytes      BIGINT,
  sha256_hash          CHAR(64),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inspection_unmatched_queue (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_report_id UUID NOT NULL UNIQUE REFERENCES inspection_reports(id) ON DELETE CASCADE,
  reason               TEXT NOT NULL,
  resolved_at          TIMESTAMPTZ,
  resolved_by_user_id  UUID REFERENCES users(id),
  resolved_car_id      UUID REFERENCES cars(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------- INSPECTION REQUESTS (Sell / PDI — Phase 2) --------------------

CREATE TABLE inspection_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number           VARCHAR(30) NOT NULL UNIQUE,
  user_id                  UUID NOT NULL REFERENCES users(id),
  type                     inspection_request_type NOT NULL,
  pdi_subtype              pdi_subtype,
  status                   inspection_request_status NOT NULL DEFAULT 'Requested',
  -- intake snapshot (before a Car row exists)
  make                     VARCHAR(100),
  model                    VARCHAR(100),
  variant                  VARCHAR(100),
  registration_number      VARCHAR(30),
  vin                      VARCHAR(40),
  location_text            TEXT,
  city                     VARCHAR(100),
  inspection_report_id     UUID REFERENCES inspection_reports(id),
  resulting_car_id         UUID REFERENCES cars(id),
  external_inspection_id   UUID,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_pdi_subtype CHECK (
    type <> 'PDI' OR pdi_subtype IS NOT NULL
  )
);

ALTER TABLE inspection_reports
  ADD CONSTRAINT fk_inspection_reports_request
  FOREIGN KEY (inspection_request_id) REFERENCES inspection_requests(id);

CREATE TABLE inspection_appointments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_request_id UUID NOT NULL UNIQUE REFERENCES inspection_requests(id) ON DELETE CASCADE,
  hub_id                UUID REFERENCES hubs(id),
  scheduled_start       TIMESTAMPTZ NOT NULL,
  scheduled_end         TIMESTAMPTZ NOT NULL,
  address_text          TEXT,
  status                VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link car → current report
ALTER TABLE cars
  ADD CONSTRAINT fk_cars_current_inspection
  FOREIGN KEY (current_inspection_report_id) REFERENCES inspection_reports(id);

-- -------------------- LEADS & CRM --------------------

CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  car_id                UUID NOT NULL REFERENCES cars(id),
  source                lead_source NOT NULL DEFAULT 'Interest',
  status                lead_status NOT NULL DEFAULT 'New',
  score                 SMALLINT NOT NULL DEFAULT 0,
  assigned_employee_id  UUID REFERENCES employees(id),
  sla_due_at            TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  row_version           BIGINT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_assigned_status ON leads (assigned_employee_id, status);
CREATE UNIQUE INDEX uq_leads_open_per_user_car
  ON leads (user_id, car_id)
  WHERE status NOT IN ('Won', 'Lost');

CREATE TABLE lead_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_user_id  UUID REFERENCES users(id),
  note            TEXT NOT NULL,
  disposition     VARCHAR(50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------- TEST DRIVE ENGINE --------------------

CREATE TABLE test_drive_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id          UUID NOT NULL REFERENCES hubs(id),
  car_id          UUID REFERENCES cars(id),
  template_id     UUID REFERENCES hub_slot_templates(id),
  mode            test_drive_mode NOT NULL DEFAULT 'AtHub',
  start_utc       TIMESTAMPTZ NOT NULL,
  end_utc         TIMESTAMPTZ NOT NULL,
  capacity        SMALLINT NOT NULL CHECK (capacity > 0),
  booked_count    SMALLINT NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_slot_capacity CHECK (booked_count <= capacity),
  UNIQUE (hub_id, car_id, mode, start_utc)
);

CREATE INDEX idx_td_slots_availability
  ON test_drive_slots (car_id, start_utc)
  WHERE is_active AND booked_count < capacity;

CREATE TABLE test_drive_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number      VARCHAR(30) NOT NULL UNIQUE,
  slot_id             UUID NOT NULL REFERENCES test_drive_slots(id),
  car_id              UUID NOT NULL REFERENCES cars(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  lead_id             UUID REFERENCES leads(id),
  employee_id         UUID REFERENCES employees(id),
  mode                test_drive_mode NOT NULL,
  status              test_drive_booking_status NOT NULL DEFAULT 'Requested',
  doorstep_address    TEXT,
  otp_hash            VARCHAR(128),
  idempotency_key     VARCHAR(64) UNIQUE,
  feedback_rating     SMALLINT CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_text       TEXT,
  row_version         BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_id, user_id)
);

-- -------------------- RESERVATIONS (non-financial MVP) --------------------

CREATE TABLE reservations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number  VARCHAR(30) NOT NULL UNIQUE,
  car_id              UUID NOT NULL REFERENCES cars(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  lead_id             UUID REFERENCES leads(id),
  status              reservation_status NOT NULL DEFAULT 'Reserved',
  hold_expires_at     TIMESTAMPTZ NOT NULL,
  reserved_by_user_id UUID REFERENCES users(id),
  closed_by_user_id   UUID REFERENCES users(id),
  notes               TEXT,
  idempotency_key     VARCHAR(64) UNIQUE,
  row_version         BIGINT NOT NULL DEFAULT 0,
  reserved_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at           TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_reservations_active_car
  ON reservations (car_id)
  WHERE status IN ('Reserved', 'DealInProgress');

-- -------------------- REVIEWS (Phase 2) --------------------

CREATE TABLE reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  car_id              UUID REFERENCES cars(id),
  test_drive_booking_id UUID REFERENCES test_drive_bookings(id),
  rating_overall      SMALLINT NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  rating_condition    SMALLINT CHECK (rating_condition BETWEEN 1 AND 5),
  rating_staff        SMALLINT CHECK (rating_staff BETWEEN 1 AND 5),
  comment             TEXT,
  is_verified         BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------- NOTIFICATIONS & AUDIT --------------------

CREATE TABLE notification_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  channel         VARCHAR(20) NOT NULL,   -- push, sms, email
  template_code   VARCHAR(80) NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          VARCHAR(20) NOT NULL DEFAULT 'Pending',
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID REFERENCES users(id),
  entity_type     VARCHAR(60) NOT NULL,
  entity_id       UUID NOT NULL,
  action          VARCHAR(60) NOT NULL,
  before_state    JSONB,
  after_state     JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);

-- -------------------- CMS (MVP lightweight) --------------------

CREATE TABLE cms_banners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(200) NOT NULL,
  subtitle        TEXT,
  image_url       TEXT,
  link_url        TEXT,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from      TIMESTAMPTZ,
  valid_to        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------- IDEMPOTENCY --------------------

CREATE TABLE idempotency_keys (
  key             VARCHAR(64) PRIMARY KEY,
  request_hash    VARCHAR(64) NOT NULL,
  response_status SMALLINT,
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);
