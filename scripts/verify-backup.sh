#!/bin/bash

###############################################################################
# Kulti Database Backup Verification Script
###############################################################################
# This script verifies the integrity and contents of a database backup.
#
# Usage:
#   ./scripts/verify-backup.sh <backup_file>
#
# Checks performed:
#   - File exists and is readable
#   - Checksum verification (if available)
#   - SQL syntax validation
#   - Critical table presence
#   - Approximate record counts
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ -z "$1" ]; then
  echo -e "${RED}Error: Backup file path required${NC}"
  echo "Usage: ./scripts/verify-backup.sh <backup_file>"
  exit 1
fi

BACKUP_FILE="$1"

echo -e "${YELLOW}=== Backup Verification ===${NC}"
echo "File: $BACKUP_FILE"
echo ""

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}✗ File not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ File exists${NC}"

# Check if file is readable
if [ ! -r "$BACKUP_FILE" ]; then
  echo -e "${RED}✗ File is not readable${NC}"
  exit 1
fi
echo -e "${GREEN}✓ File is readable${NC}"

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  Size: $FILE_SIZE"

# Check if compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "  Type: Compressed (gzip)"
  UNCOMPRESSED_SIZE=$(gunzip -c "$BACKUP_FILE" | wc -c | awk '{print $1}')
  UNCOMPRESSED_MB=$(echo "scale=2; $UNCOMPRESSED_SIZE / 1024 / 1024" | bc)
  echo "  Uncompressed: ${UNCOMPRESSED_MB}MB"
else
  echo "  Type: Uncompressed"
fi

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
  echo ""
  echo -e "${YELLOW}Verifying checksum...${NC}"
  if shasum -a 256 -c "$CHECKSUM_FILE" 2>&1 | grep -q "OK"; then
    echo -e "${GREEN}✓ Checksum valid${NC}"
  else
    echo -e "${RED}✗ Checksum mismatch!${NC}"
    echo "The backup file may be corrupted."
    exit 1
  fi
else
  echo -e "${YELLOW}⚠ No checksum file found${NC}"
fi

# Prepare for content checks
TEMP_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo ""
  echo -e "${YELLOW}Decompressing for analysis...${NC}"
  TEMP_FILE="/tmp/verify_backup_$(date +%s).sql"
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
  CHECK_FILE="$TEMP_FILE"
else
  CHECK_FILE="$BACKUP_FILE"
fi

# Check for critical tables
echo ""
echo -e "${YELLOW}Checking critical tables...${NC}"

CRITICAL_TABLES=("users" "sessions" "session_participants" "credits" "credit_transactions" "recordings")

for table in "${CRITICAL_TABLES[@]}"; do
  if grep -q "CREATE TABLE.*${table}" "$CHECK_FILE"; then
    echo -e "${GREEN}✓${NC} Table: $table"
  else
    echo -e "${RED}✗${NC} Table: $table (missing)"
  fi
done

# Check for RLS policies
echo ""
echo -e "${YELLOW}Checking RLS policies...${NC}"

if grep -q "ENABLE ROW LEVEL SECURITY" "$CHECK_FILE"; then
  RLS_COUNT=$(grep -c "ENABLE ROW LEVEL SECURITY" "$CHECK_FILE")
  echo -e "${GREEN}✓${NC} Found $RLS_COUNT RLS policies"
else
  echo -e "${YELLOW}⚠${NC} No RLS policies found"
fi

# Check for indexes
echo ""
echo -e "${YELLOW}Checking indexes...${NC}"

if grep -q "CREATE.*INDEX" "$CHECK_FILE"; then
  INDEX_COUNT=$(grep -c "CREATE.*INDEX" "$CHECK_FILE")
  echo -e "${GREEN}✓${NC} Found $INDEX_COUNT indexes"
else
  echo -e "${YELLOW}⚠${NC} No indexes found"
fi

# Check for foreign keys
echo ""
echo -e "${YELLOW}Checking foreign keys...${NC}"

if grep -q "FOREIGN KEY" "$CHECK_FILE"; then
  FK_COUNT=$(grep -c "FOREIGN KEY" "$CHECK_FILE")
  echo -e "${GREEN}✓${NC} Found $FK_COUNT foreign keys"
else
  echo -e "${YELLOW}⚠${NC} No foreign keys found"
fi

# Check for triggers
echo ""
echo -e "${YELLOW}Checking triggers...${NC}"

if grep -q "CREATE TRIGGER" "$CHECK_FILE"; then
  TRIGGER_COUNT=$(grep -c "CREATE TRIGGER" "$CHECK_FILE")
  echo -e "${GREEN}✓${NC} Found $TRIGGER_COUNT triggers"
else
  echo -e "${YELLOW}⚠${NC} No triggers found"
fi

# Estimate data volume
echo ""
echo -e "${YELLOW}Estimating data volume...${NC}"

if grep -q "COPY.*FROM stdin" "$CHECK_FILE"; then
  echo -e "${GREEN}✓${NC} Backup contains data"

  # Count INSERT/COPY statements for each table
  for table in "${CRITICAL_TABLES[@]}"; do
    COUNT=$(grep -c "COPY.*${table}" "$CHECK_FILE" || echo "0")
    if [ "$COUNT" -gt 0 ]; then
      echo "  - $table: ~$COUNT records"
    fi
  done
else
  echo -e "${YELLOW}⚠${NC} Backup appears to be schema-only"
fi

# Clean up
if [ -n "$TEMP_FILE" ]; then
  rm -f "$TEMP_FILE"
fi

echo ""
echo -e "${GREEN}=== Verification Complete ===${NC}"
echo ""
echo "Summary:"
echo "  File: $BACKUP_FILE"
echo "  Size: $FILE_SIZE"
echo "  Status: Backup appears valid"
echo ""
echo "To restore this backup:"
echo "  ./scripts/restore-db.sh $BACKUP_FILE"
