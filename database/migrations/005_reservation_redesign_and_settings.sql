-- ============================================================
-- AssureCars — Migration 005: Reservation Redesign & Settings
-- ------------------------------------------------------------
-- Purpose
--   Reflect the confirmed workflow changes:
--     * Reservation becomes a STAFF (Hub Admin) action after an
--       OFFLINE token payment. Users can NO LONGER self-reserve.
--       A reservation MUST be created against an existing open lead
--       for the same car/hub.
--     * Reserved cars are fully locked (read-only): no interest,
--       no test drive, no second reservation until released
--       (enforced in application layer + uq_reservations_active_car).
--     * Configurable hold period, DEFAULT 15 DAYS; Super Admin owns
--       this setting; auto-release if not marked Sold in time.
--     * Optional OFFLINE token money recorded for REFERENCE/DISPLAY
--       only (flag + amount) — NO ledger, NO settlement.
--     * Configurable minimum publish score on dealer settings.
--     * Sell request indicative quote / final offer as DISPLAY-only
--       reference fields (money stays offline; no ledger).
--     * Optional per-hub daily inspection (technician) capacity to
--       support Sell/PDI appointment availability (Phase 2).
--
-- Scope boundary (constitution — Non-Financial Boundary)
--   * All money (token, quote, offer) is captured OFFLINE and stored
--     here as reference/display only. No payout, balance, or
--     settlement logic is introduced.
--
-- Notes
--   * Forward-only. Safe to run once after 004_hub_roles_and_scoping.sql.
-- ============================================================

-- -------------------- DEALER SETTINGS --------------------
-- Hold expressed in DAYS (default 15). The legacy reservation_hold_hours
-- column is retained for backward compatibility but hold_days is authoritative.
ALTER TABLE dealer_settings
  ADD COLUMN IF NOT EXISTS reservation_hold_days INT NOT NULL DEFAULT 15;

ALTER TABLE dealer_settings
  ADD COLUMN IF NOT EXISTS min_publish_score SMALLINT NOT NULL DEFAULT 70;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_min_publish_score'
  ) THEN
    ALTER TABLE dealer_settings
      ADD CONSTRAINT chk_min_publish_score
      CHECK (min_publish_score BETWEEN 0 AND 100);
  END IF;
END $$;

COMMENT ON COLUMN dealer_settings.reservation_hold_days IS
  'Super Admin-configurable reservation hold period in days (default 15). If a reservation is not marked Sold within this window it is auto-released back to Live.';
COMMENT ON COLUMN dealer_settings.min_publish_score IS
  'Minimum inspection overall_score (0-100, default 70) required — in addition to a passing recommendation — before a car may be Certified/Live.';

-- -------------------- RESERVATIONS: STAFF-DRIVEN MODEL --------------------
-- A reservation is now created by a Hub Admin (super_admin superset), not the
-- buyer. The buyer is always represented by an existing lead. Walk-ins must be
-- captured as leads first so the reservation remains attached to the CRM funnel.
ALTER TABLE reservations
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS token_received      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS token_amount_paise  BIGINT,
  ADD COLUMN IF NOT EXISTS notified_employee_id UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS last_followup_notified_at TIMESTAMPTZ;

ALTER TABLE reservations
  ALTER COLUMN lead_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_lead_required'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT chk_reservation_lead_required CHECK (lead_id IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN reservations.token_received IS
  'Reference flag: an offline token payment was received before reserving. Display-only — no ledger/settlement.';
COMMENT ON COLUMN reservations.token_amount_paise IS
  'Offline token amount (paise) for staff reference/display only. No money movement is performed by the platform.';
COMMENT ON COLUMN reservations.notified_employee_id IS
  'Hub Employee last notified (via Employee App) to follow up on the final deal for this reservation.';

-- -------------------- SELL REQUEST: DISPLAY-ONLY MONEY REFERENCES --------------------
ALTER TABLE inspection_requests
  ADD COLUMN IF NOT EXISTS indicative_quote_paise BIGINT,
  ADD COLUMN IF NOT EXISTS final_offer_paise      BIGINT;

COMMENT ON COLUMN inspection_requests.indicative_quote_paise IS
  'Sell request: indicative quote shown to the seller (paise), reference/display only. No money movement (offline).';
COMMENT ON COLUMN inspection_requests.final_offer_paise IS
  'Sell request: revised final offer after inspection (paise), reference/display only. No money movement (offline).';

-- -------------------- HUB: INSPECTION (TECHNICIAN) DAILY CAPACITY --------------------
-- Sell/PDI inspection appointments are technician-bound (not test-drive slots).
-- Optional per-hub daily capacity supports appointment availability checks.
ALTER TABLE hubs
  ADD COLUMN IF NOT EXISTS daily_inspection_capacity SMALLINT;

COMMENT ON COLUMN hubs.daily_inspection_capacity IS
  'Optional max inspection appointments per day for this hub (Sell/PDI). NULL = unbounded / managed manually.';
