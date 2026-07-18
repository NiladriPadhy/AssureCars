-- ============================================================
-- AssureCars — Migration 003: Consignor Commission Rate
-- ------------------------------------------------------------
-- Purpose
--   Capture the agreed commission rate (%) on a Consignor at
--   onboarding, for BOTH Vendor and Individual consignors. This
--   is non-financial reference/display data used by dealer staff.
--
-- Scope boundary (see constitution §III — Non-Financial MVP Boundary)
--   * IN scope:  recording the agreed commission rate (%).
--   * OUT of scope: payout calculation, balance tracking, and
--     settlement — those remain the dealer's OFFLINE process.
--     No ledger, no money movement is introduced here.
--
-- Notes
--   * Rate is stored as a percentage in [0, 100] with two decimals
--     (e.g. 5.00, 12.50). Nullable — a consignor may be onboarded
--     before terms are agreed; the Admin UI prompts for it.
--   * Consigned cars inherit their consignor's rate for display
--     (via join); no per-car override column is introduced.
--   * Forward-only. Safe to run once after 002_inspection_complete_data.sql.
-- ============================================================

ALTER TABLE consignors
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2);

ALTER TABLE consignors
  ADD CONSTRAINT chk_consignor_commission_pct
  CHECK (commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 100));

COMMENT ON COLUMN consignors.commission_pct IS
  'Agreed commission rate (percent, 0-100) captured at onboarding for Vendor & Individual consignors. Reference/display only — no payout calculation or settlement (offline).';
