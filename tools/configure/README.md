# AssureCars Dealer Configuration Generator

Generates per-component configuration from a single `dealer.manifest.yaml` per dealership.

## Prerequisites

- Python 3.10+
- Dependencies installed automatically by `generate.sh` (creates `.venv`)

## Commands

```bash
# Generate all artifacts for a dealer
./tools/configure/generate.sh acme-motors

# Validate manifest only (no output)
./tools/configure/generate.sh acme-motors --validate-only

# Direct Python (if venv already exists)
python3 tools/configure/generate.py acme-motors
```

## Manifest schema

Validated against [`schema/dealer.manifest.schema.json`](schema/dealer.manifest.schema.json).

Key rules:
- `dealer.id` must match the folder name (`dealers/<id>/`)
- `schemaVersion` must be `"1.0"`
- Secrets live in `secrets.env` (referenced by `secretsRef`), never in the manifest

## Template → output map

| Template | Output |
|----------|--------|
| `deploy/dotenv.j2` | `out/deploy/.env` |
| `deploy/docker-compose.override.j2` | `out/deploy/docker-compose.override.yml` |
| `webapi/appsettings.Production.json.j2` | `out/webapi/appsettings.Production.json` |
| `database/bootstrap.sql.j2` | `out/database/bootstrap.sql` |
| `website/environment.prod.ts.j2` | `out/website/environment.prod.ts` |
| `admin-portal/environment.prod.ts.j2` | `out/admin-portal/environment.prod.ts` |
| `user-app/dealer.json.j2` | `out/user-app/dealer.json` |
| `user-app/dart-defines.env.j2` | `out/user-app/dart-defines.env` |
| `employee-app/dealer.json.j2` | `out/employee-app/dealer.json` |
| `employee-app/dart-defines.env.j2` | `out/employee-app/dart-defines.env` |
| `inspection-app/dealer_config.json.j2` | `out/inspection-app/dealer_config.json` |
| `inspection-app/local.properties.j2` | `out/inspection-app/local.properties` |
| `inspection-app/flavor.properties.j2` | `out/inspection-app/flavor.properties` |
| `shared/public-config.json.j2` | `out/shared/public-config.json` |

## Flutter build example

```bash
flutter build apk \
  --dart-define-from-file=dealers/acme-motors/out/user-app/dart-defines.env
```

## Kotlin inspection app example

```bash
# Merge generated local.properties into the project
cat dealers/acme-motors/out/inspection-app/local.properties \
  >> Vehicle-Inspection-Kotlin-Product/local.properties

cp dealers/acme-motors/out/inspection-app/dealer_config.json \
  Vehicle-Inspection-Kotlin-Product/app/src/main/assets/dealer_config.json
```

## Runtime config API

Deploy-time config seeds the database. At runtime, clients should fetch live settings from:

```
GET /v1/public/config
```

The `out/shared/public-config.json` file is the reference payload shape for that endpoint.

## Adding a new config field

1. Add the field to `dealers/_template/dealer.manifest.yaml`
2. Update `schema/dealer.manifest.schema.json`
3. Update the relevant Jinja2 template(s)
4. Regenerate: `./tools/configure/generate.sh <dealer-id>`

## CI/CD matrix build

```yaml
# .github/workflows/dealer-config.yml (example)
strategy:
  matrix:
    dealer: [acme-motors, beta-cars]
steps:
  - run: ./tools/configure/generate.sh ${{ matrix.dealer }} --validate-only
```
