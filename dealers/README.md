# Dealer Instances

Each AssureCars dealer runs as an **isolated, self-hosted instance**. Configuration is driven by a single manifest per dealer.

## Quick start

```bash
# 1. Create a new dealer from the template
cp -r dealers/_template dealers/my-dealer

# 2. Edit the manifest
vim dealers/my-dealer/dealer.manifest.yaml

# 3. Add secrets (never commit)
cp dealers/my-dealer/secrets.env.example dealers/my-dealer/secrets.env
vim dealers/my-dealer/secrets.env

# 4. Generate all component configs
./tools/configure/generate.sh my-dealer

# 5. Deploy
export DEALER_ID=my-dealer
docker compose -f deploy/docker-compose.yml \
  -f dealers/my-dealer/out/deploy/docker-compose.override.yml \
  --env-file dealers/my-dealer/out/deploy/.env up -d
```

## Folder layout

```
dealers/
  _template/                  # Copy this for each new dealer
    dealer.manifest.yaml      # ← single source of truth
    secrets.env.example
    assets/                   # logo, favicon, app icons
  acme-motors/                # Example dealer (safe to commit)
    dealer.manifest.yaml
    secrets.env               # gitignored
    out/                      # gitignored — generated artifacts
      deploy/
      webapi/
      database/
      website/
      admin-portal/
      user-app/
      employee-app/
      inspection-app/
      shared/
```

## What the manifest controls

| Tier | Source | Examples |
|------|--------|----------|
| **Deploy-time** | `dealer.manifest.yaml` | Domains, API URLs, bundle IDs, DB name, feature defaults |
| **Secrets** | `secrets.env` | Passwords, JWT secret, SMS/email/push API keys |
| **Runtime** | PostgreSQL `dealer_settings` + Admin Portal | Hubs, slot rules, live feature toggles, branding tweaks |

## Generated outputs per component

| Component | Output path | Copy to |
|-----------|-------------|---------|
| Web API (.NET) | `out/webapi/appsettings.Production.json` | WebAPI project / Docker volume |
| PostgreSQL | `out/database/bootstrap.sql` | Run after migrations |
| Website (Angular) | `out/website/environment.prod.ts` | `website/src/environments/` |
| Admin Portal (Angular) | `out/admin-portal/environment.prod.ts` | `admin-portal/src/environments/` |
| User App (Flutter) | `out/user-app/dealer.json` + `dart-defines.env` | `assets/config/` + build flags |
| Employee App (Flutter) | `out/employee-app/dealer.json` + `dart-defines.env` | same |
| Inspection App (Kotlin) | `out/inspection-app/local.properties` + `dealer_config.json` | `Vehicle-Inspection-Kotlin-Product/` |
| Docker Compose | `out/deploy/.env` + `docker-compose.override.yml` | Used directly at deploy |
| Public config seed | `out/shared/public-config.json` | Reference for `GET /v1/public/config` |

See [`tools/configure/README.md`](../tools/configure/README.md) for full documentation.
