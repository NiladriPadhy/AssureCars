-- ============================================================
-- AssureCars — Migration 004: Hub Role Hierarchy & Hub Scoping
-- ------------------------------------------------------------
-- Purpose
--   Introduce the hub-centric role hierarchy and scope core
--   entities to hubs:
--     * Roles: super_admin (global), hub_admin (hub-scoped),
--       hub_employee (hub-scoped).
--     * Consignors become hub-scoped (onboarded "for a hub").
--     * Sell/PDI inspection_requests capture customer geo and the
--       assigned (nearest) hub that owns the activity.
--
-- Role → auth mapping (enforced in application/auth layer)
--   * super_admin   → accountType=Admin,    allowedClients=[AdminPortal]        (all hubs)
--   * hub_admin     → accountType=Admin,    allowedClients=[AdminPortal]        (assigned hubs via employee_hubs)
--   * hub_employee  → accountType=Employee, allowedClients=[EmployeeApp,
--                                                           InspectionApp]      (assigned hubs via employee_hubs)
--   * user          → accountType=User,     allowedClients=[UserApp, Website]
--
-- Hub scoping
--   * hub_admin & hub_employee are linked to one OR MORE hubs via the
--     existing employee_hubs (many-to-many) table.
--   * super_admin has NO employee_hubs rows and is treated as global.
--
-- Notes
--   * Forward-only. Safe to run once after 003_consignor_commission.sql.
--   * Assumes prototype baseline with no conflicting pre-existing
--     consignor rows (consignors.hub_id is set NOT NULL).
-- ============================================================

-- -------------------- CANONICAL ROLES --------------------
INSERT INTO roles (code, name, description) VALUES
  ('super_admin',  'Super Admin',  'Global administrator (all hubs). Onboards hubs, hub admins, hub employees, and consignors. Owns dealer-wide settings. Admin Portal only.'),
  ('hub_admin',    'Hub Admin',    'Hub-scoped administrator. Onboards hub employees and consignors for their hub(s); manages their hub catalog. Admin Portal only.'),
  ('hub_employee', 'Hub Employee', 'Hub-scoped staff. Runs sales, test-drive, and inspection operations for their hub(s). Employee App + Inspection App.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

COMMENT ON TABLE employee_hubs IS
  'Hub scoping for staff. hub_admin and hub_employee are linked to one or more hubs here (is_primary marks the home hub). super_admin is global and has no rows.';

-- -------------------- CONSIGNORS: HUB SCOPING --------------------
-- Each consignor belongs to exactly one hub (onboarded "for a hub").
ALTER TABLE consignors
  ADD COLUMN IF NOT EXISTS hub_id UUID REFERENCES hubs(id);

ALTER TABLE consignors
  ALTER COLUMN hub_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consignors_hub ON consignors (hub_id);

COMMENT ON COLUMN consignors.hub_id IS
  'The single hub this consignor is onboarded for. A consigned car must be assigned to the same hub as its consignor (enforced by trg_car_consignor_same_hub).';

-- -------------------- CAR ↔ CONSIGNOR SAME-HUB INTEGRITY --------------------
-- A consigned car (ConsignedVendor / ConsignedIndividual) must live in the
-- same hub as its consignor. Enforced via trigger because it spans two tables.
CREATE OR REPLACE FUNCTION enforce_car_consignor_same_hub()
RETURNS TRIGGER AS $$
DECLARE
  consignor_hub UUID;
BEGIN
  IF NEW.consignor_id IS NULL THEN
    RETURN NEW;  -- Owned cars: nothing to check.
  END IF;

  SELECT hub_id INTO consignor_hub FROM consignors WHERE id = NEW.consignor_id;

  IF NEW.hub_id IS NULL THEN
    RAISE EXCEPTION 'Consigned car % must have a hub_id (consignor is bound to hub %)', NEW.id, consignor_hub;
  END IF;

  IF NEW.hub_id <> consignor_hub THEN
    RAISE EXCEPTION 'Consigned car hub (%) must equal its consignor hub (%)', NEW.hub_id, consignor_hub;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_car_consignor_same_hub ON cars;
CREATE TRIGGER trg_car_consignor_same_hub
  BEFORE INSERT OR UPDATE OF hub_id, consignor_id ON cars
  FOR EACH ROW EXECUTE FUNCTION enforce_car_consignor_same_hub();

-- -------------------- SELL/PDI: CUSTOMER GEO + NEAREST-HUB ASSIGNMENT --------------------
-- Requests are routed to the customer's nearest active hub, which then owns
-- the activity. Location is captured as GPS (preferred) or geocoded pincode.
ALTER TABLE inspection_requests
  ADD COLUMN IF NOT EXISTS pincode           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS customer_latitude  NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS customer_longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS assigned_hub_id    UUID REFERENCES hubs(id);

CREATE INDEX IF NOT EXISTS idx_inspection_requests_assigned_hub
  ON inspection_requests (assigned_hub_id, status);

COMMENT ON COLUMN inspection_requests.assigned_hub_id IS
  'Nearest active hub that owns this Sell/PDI request (auto-assigned from customer geo; Super Admin may reassign; NULL only when awaiting manual assignment because no hub was in range).';
