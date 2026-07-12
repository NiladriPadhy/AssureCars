#!/usr/bin/env bash
#
# Interactive build script for the Vehicle Inspection project.
#
#   - Prompts whether to build the Inspection app (:app), the Admin app (:admin-app), or both.
#   - Prompts for the build type (release [default] or debug).
#   - For release builds, ensures a signing keystore exists (offering to generate one via keytool)
#     and wires it up through keystore.properties.
#   - Runs the Gradle assemble task(s) and prints the resulting APK paths.
#
# Usage:
#   ./build.sh                      # fully interactive
#   ./build.sh --app both --release # non-interactive (also: --app inspection|admin|both,
#                                   #   --debug, --release)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

KEYSTORE_PROPS="$ROOT_DIR/keystore.properties"
DEFAULT_KEYSTORE_DIR="$ROOT_DIR/keystore"
DEFAULT_KEYSTORE_FILE="$DEFAULT_KEYSTORE_DIR/vsp-release.jks"

# ---- pretty output -------------------------------------------------------
bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '\033[36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*"; }
err()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }

# ---- CLI args (optional; skip prompts when provided) ---------------------
APP_CHOICE=""
BUILD_TYPE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app) APP_CHOICE="${2:-}"; shift 2 ;;
    --release) BUILD_TYPE="release"; shift ;;
    --debug) BUILD_TYPE="debug"; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

# ---- 1. which app(s)? ----------------------------------------------------
if [[ -z "$APP_CHOICE" ]]; then
  bold "Which app do you want to build?"
  echo "  1) Inspection app (:app)"
  echo "  2) Admin app (:admin-app)"
  echo "  3) Both"
  read -r -p "Enter choice [1/2/3]: " choice
  case "$choice" in
    1) APP_CHOICE="inspection" ;;
    2) APP_CHOICE="admin" ;;
    3) APP_CHOICE="both" ;;
    *) err "Invalid choice: $choice"; exit 1 ;;
  esac
fi

case "$APP_CHOICE" in
  inspection|admin|both) ;;
  *) err "Invalid --app value: $APP_CHOICE (use inspection|admin|both)"; exit 1 ;;
esac

# ---- 2. build type? ------------------------------------------------------
if [[ -z "$BUILD_TYPE" ]]; then
  read -r -p "Build type — [R]elease (signed) or [d]ebug? [R/d]: " bt
  case "$bt" in
    d|D|debug) BUILD_TYPE="debug" ;;
    *) BUILD_TYPE="release" ;;
  esac
fi

# ---- 3. keystore handling (release only) ---------------------------------
read_prop() {
  # read_prop <key> <file>
  local key="$1" file="$2"
  [[ -f "$file" ]] || return 1
  local line
  line="$(grep -E "^${key}=" "$file" | head -n1 || true)"
  [[ -n "$line" ]] || return 1
  printf '%s' "${line#*=}"
}

resolve_path() {
  # resolve a possibly-relative (to repo root) path to absolute
  local p="$1"
  case "$p" in
    /*) printf '%s' "$p" ;;
    *)  printf '%s/%s' "$ROOT_DIR" "$p" ;;
  esac
}

keystore_ready() {
  [[ -f "$KEYSTORE_PROPS" ]] || return 1
  local sf
  sf="$(read_prop storeFile "$KEYSTORE_PROPS")" || return 1
  [[ -f "$(resolve_path "$sf")" ]]
}

generate_keystore() {
  command -v keytool >/dev/null 2>&1 || {
    err "keytool not found on PATH (it ships with the JDK). Install a JDK or set JAVA_HOME."
    exit 1
  }
  bold "Generating a new release keystore"
  local ks_file alias store_pw key_pw validity dname
  read -r -p "Keystore path [$DEFAULT_KEYSTORE_FILE]: " ks_file
  ks_file="${ks_file:-$DEFAULT_KEYSTORE_FILE}"
  read -r -p "Key alias [vsp]: " alias
  alias="${alias:-vsp}"
  read -r -s -p "Keystore password (min 6 chars): " store_pw; echo
  [[ ${#store_pw} -ge 6 ]] || { err "Password too short."; exit 1; }
  read -r -s -p "Confirm keystore password: " store_pw2; echo
  [[ "$store_pw" == "$store_pw2" ]] || { err "Passwords do not match."; exit 1; }
  read -r -s -p "Key password [same as keystore]: " key_pw; echo
  key_pw="${key_pw:-$store_pw}"
  read -r -p "Validity in days [10000]: " validity
  validity="${validity:-10000}"
  read -r -p "Name/Org for the certificate (CN) [Vehicle Inspection]: " dname
  dname="${dname:-Vehicle Inspection}"

  mkdir -p "$(dirname "$ks_file")"
  keytool -genkeypair -v \
    -keystore "$ks_file" \
    -alias "$alias" \
    -keyalg RSA -keysize 2048 -validity "$validity" \
    -storepass "$store_pw" -keypass "$key_pw" \
    -dname "CN=$dname, OU=Mobile, O=Vehicle Inspection, C=IN"
  ok "Keystore created at $ks_file"

  # Store a repo-root-relative path when possible (cleaner + portable).
  local rel="$ks_file"
  case "$ks_file" in "$ROOT_DIR"/*) rel="${ks_file#"$ROOT_DIR"/}" ;; esac

  cat > "$KEYSTORE_PROPS" <<EOF
storeFile=$rel
storePassword=$store_pw
keyAlias=$alias
keyPassword=$key_pw
EOF
  chmod 600 "$KEYSTORE_PROPS"
  ok "Wrote $KEYSTORE_PROPS (git-ignored)."
}

if [[ "$BUILD_TYPE" == "release" ]]; then
  if keystore_ready; then
    ok "Using release keystore from keystore.properties."
  else
    warn "No usable release keystore found."
    read -r -p "Generate a new keystore now? [Y/n]: " gen
    case "$gen" in
      n|N) err "Release build needs a keystore. Aborting (or re-run and choose debug)."; exit 1 ;;
      *) generate_keystore ;;
    esac
  fi
fi

# ---- 4. assemble --------------------------------------------------------
# --no-build-cache avoids a Gradle build-cache collision when multiple copies of this project exist
# side by side on disk. Override the whole set via GRADLE_ARGS if you don't need it.
GRADLE_ARGS="${GRADLE_ARGS:---no-build-cache}"

variant_suffix() { [[ "$1" == "release" ]] && echo "Release" || echo "Debug"; }
V="$(variant_suffix "$BUILD_TYPE")"

TASKS=()
[[ "$APP_CHOICE" == "inspection" || "$APP_CHOICE" == "both" ]] && TASKS+=(":app:assemble${V}")
[[ "$APP_CHOICE" == "admin"      || "$APP_CHOICE" == "both" ]] && TASKS+=(":admin-app:assemble${V}")

info "Building: ${TASKS[*]}  (gradle args: ${GRADLE_ARGS})"
# shellcheck disable=SC2086
./gradlew ${GRADLE_ARGS} "${TASKS[@]}"

# ---- 5. report APK locations --------------------------------------------
print_apk() {
  # print_apk <module-dir> <variant-dir>
  local dir="$ROOT_DIR/$1/build/outputs/apk/$2"
  if [[ -d "$dir" ]]; then
    while IFS= read -r apk; do ok "APK: $apk"; done < <(find "$dir" -name '*.apk' 2>/dev/null)
  fi
}

echo
bold "Build finished."
[[ "$APP_CHOICE" == "inspection" || "$APP_CHOICE" == "both" ]] && print_apk "app" "$BUILD_TYPE"
[[ "$APP_CHOICE" == "admin"      || "$APP_CHOICE" == "both" ]] && print_apk "admin-app" "$BUILD_TYPE"

if [[ "$BUILD_TYPE" == "release" ]] && ! keystore_ready; then
  warn "Release APK(s) are UNSIGNED (no keystore configured)."
fi
