#!/usr/bin/env python3
"""
AssureCars dealer configuration generator.

Reads dealers/<dealer-id>/dealer.manifest.yaml (+ secrets.env) and emits
per-component config artifacts into dealers/<dealer-id>/out/.

Usage:
  python3 tools/configure/generate.py acme-motors
  python3 tools/configure/generate.py acme-motors --validate-only
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
CONFIGURE_DIR = Path(__file__).resolve().parent
DEALERS_DIR = ROOT / "dealers"
SCHEMA_PATH = CONFIGURE_DIR / "schema" / "dealer.manifest.schema.json"
TEMPLATES_DIR = CONFIGURE_DIR / "templates"

# (template path relative to templates/, output path relative to dealers/<id>/out/)
OUTPUT_MAP: list[tuple[str, str]] = [
    ("deploy/dotenv.j2", "deploy/.env"),
    ("deploy/docker-compose.override.j2", "deploy/docker-compose.override.yml"),
    ("webapi/appsettings.Production.json.j2", "webapi/appsettings.Production.json"),
    ("database/bootstrap.sql.j2", "database/bootstrap.sql"),
    ("website/environment.prod.ts.j2", "website/environment.prod.ts"),
    ("admin-portal/environment.prod.ts.j2", "admin-portal/environment.prod.ts"),
    ("user-app/dealer.json.j2", "user-app/dealer.json"),
    ("user-app/dart-defines.env.j2", "user-app/dart-defines.env"),
    ("employee-app/dealer.json.j2", "employee-app/dealer.json"),
    ("employee-app/dart-defines.env.j2", "employee-app/dart-defines.env"),
    ("inspection-app/dealer_config.json.j2", "inspection-app/dealer_config.json"),
    ("inspection-app/local.properties.j2", "inspection-app/local.properties"),
    ("inspection-app/flavor.properties.j2", "inspection-app/flavor.properties"),
    ("shared/public-config.json.j2", "shared/public-config.json"),
]


def load_secrets(dealer_dir: Path, secrets_ref: str) -> dict[str, str]:
    secrets_path = dealer_dir / secrets_ref
    if not secrets_path.exists():
        print(f"ERROR: secrets file not found: {secrets_path}", file=sys.stderr)
        print(f"       Copy secrets.env.example → secrets.env and fill in values.", file=sys.stderr)
        sys.exit(1)

    secrets: dict[str, str] = {}
    for line in secrets_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        secrets[key.strip()] = value.strip()
    return secrets


def load_manifest(dealer_dir: Path) -> dict:
    manifest_path = dealer_dir / "dealer.manifest.yaml"
    if not manifest_path.exists():
        print(f"ERROR: manifest not found: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    with manifest_path.open(encoding="utf-8") as f:
        manifest = yaml.safe_load(f)

    if not isinstance(manifest, dict):
        print("ERROR: dealer.manifest.yaml must be a YAML mapping.", file=sys.stderr)
        sys.exit(1)

    return manifest


def validate_manifest(manifest: dict) -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(manifest), key=lambda e: list(e.path))
    if errors:
        print("ERROR: manifest validation failed:", file=sys.stderr)
        for err in errors:
            path = ".".join(str(p) for p in err.path) or "(root)"
            print(f"  - {path}: {err.message}", file=sys.stderr)
        sys.exit(1)


def build_context(manifest: dict, secrets: dict[str, str]) -> dict:
    ctx = dict(manifest)
    ctx["secrets"] = secrets
    ctx["generatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return ctx


def render_outputs(dealer_id: str, ctx: dict) -> Path:
    out_dir = DEALERS_DIR / dealer_id / "out"
    out_dir.mkdir(parents=True, exist_ok=True)

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
        trim_blocks=False,
        lstrip_blocks=False,
    )

    for template_rel, output_rel in OUTPUT_MAP:
        template = env.get_template(template_rel)
        rendered = template.render(**ctx)
        output_path = out_dir / output_rel
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered, encoding="utf-8")
        print(f"  ✓ {output_rel}")

    # Manifest snapshot for audit
    snapshot_path = out_dir / "manifest.snapshot.json"
    snapshot = {**ctx, "secrets": {"_redacted": True}}
    snapshot_path.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"  ✓ manifest.snapshot.json (secrets redacted)")

    return out_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AssureCars dealer config artifacts")
    parser.add_argument("dealer_id", help="Dealer folder name, e.g. acme-motors")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate manifest + secrets exist without generating output",
    )
    args = parser.parse_args()

    dealer_dir = DEALERS_DIR / args.dealer_id
    if not dealer_dir.is_dir():
        print(f"ERROR: dealer folder not found: {dealer_dir}", file=sys.stderr)
        print(f"       Run: cp -r dealers/_template dealers/{args.dealer_id}", file=sys.stderr)
        sys.exit(1)

    manifest = load_manifest(dealer_dir)
    validate_manifest(manifest)

    if manifest["dealer"]["id"] != args.dealer_id:
        print(
            f"ERROR: folder name '{args.dealer_id}' does not match dealer.id "
            f"'{manifest['dealer']['id']}'",
            file=sys.stderr,
        )
        sys.exit(1)

    secrets = load_secrets(dealer_dir, manifest["secretsRef"])

    if args.validate_only:
        print(f"OK: {args.dealer_id} manifest is valid.")
        return

    print(f"Generating config for dealer '{args.dealer_id}'...")
    ctx = build_context(manifest, secrets)
    out_dir = render_outputs(args.dealer_id, ctx)
    print(f"\nDone → {out_dir.relative_to(ROOT)}/")
    print("\nNext steps:")
    print(f"  1. docker compose -f deploy/docker-compose.yml \\")
    print(f"       -f {out_dir.relative_to(ROOT)}/deploy/docker-compose.override.yml \\")
    print(f"       --env-file {out_dir.relative_to(ROOT)}/deploy/.env up -d")
    print(f"  2. Copy webapi/appsettings.Production.json into your WebAPI project")
    print(f"  3. Copy website/ + admin-portal/ environments into Angular projects")
    print(f"  4. Copy user-app/ + employee-app/ configs into Flutter projects")
    print(f"  5. Merge inspection-app/local.properties into Kotlin project")


if __name__ == "__main__":
    main()
