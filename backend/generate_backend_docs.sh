#!/usr/bin/env bash

# --------------------------------------------------
# Generate backend documentation from Python modules
# Wrapper script for generate_backend_docs.py
# --------------------------------------------------

set -e

# Default paths
SOURCE_DIR="${1:-./src}"
OUTPUT_DIR="${2:-../docs/pages/backend/components}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_SCRIPT="$SCRIPT_DIR/generate_doc.py"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check Python script
if [ ! -f "$PY_SCRIPT" ]; then
  log_error "Python script not found: $PY_SCRIPT"
  exit 1
fi

# Check python
if ! command -v python3 >/dev/null 2>&1; then
  log_error "python3 not found in PATH"
  exit 1
fi

log_info "Starting documentation generation"
log_info "Source: $SOURCE_DIR"
log_info "Output: $OUTPUT_DIR"

echo ""

python3 "$PY_SCRIPT" "$SOURCE_DIR" "$OUTPUT_DIR"

echo ""
log_success "Documentation generation finished"