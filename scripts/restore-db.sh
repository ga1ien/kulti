#!/bin/bash

###############################################################################
# Kulti Database Restore Script
###############################################################################
# This script restores a Supabase PostgreSQL database from a backup.
#
# Usage:
#   ./scripts/restore-db.sh <backup_file>
#
# Requirements:
#   - Supabase CLI installed
#   - SUPABASE_PROJECT_REF environment variable set
#   - SUPABASE_DB_PASSWORD environment variable set
#   - psql installed (comes with PostgreSQL)
#
# WARNING: This will overwrite existing database data!
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Backup file path required${NC}"
  echo "Usage: ./scripts/restore-db.sh <backup_file>"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
  exit 1
fi

# Verify required environment variables
if [ -z "$SUPABASE_PROJECT_REF" ]; then
  echo -e "${RED}Error: SUPABASE_PROJECT_REF environment variable not set${NC}"
  exit 1
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo -e "${RED}Error: SUPABASE_DB_PASSWORD environment variable not set${NC}"
  exit 1
fi

echo -e "${YELLOW}=== Kulti Database Restore ===${NC}"
echo "Project: $SUPABASE_PROJECT_REF"
echo "Backup file: $BACKUP_FILE"
echo ""

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
  echo -e "${YELLOW}Verifying backup checksum...${NC}"
  if shasum -a 256 -c "$CHECKSUM_FILE"; then
    echo -e "${GREEN}✓ Checksum verified${NC}"
  else
    echo -e "${RED}✗ Checksum verification failed!${NC}"
    echo "The backup file may be corrupted. Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
else
  echo -e "${YELLOW}⚠ No checksum file found, skipping verification${NC}"
fi

# Final confirmation
echo -e "${RED}WARNING: This will overwrite all data in the database!${NC}"
echo "Are you sure you want to continue? (yes/no)"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Decompress if needed
TEMP_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo -e "${YELLOW}Decompressing backup...${NC}"
  TEMP_FILE="/tmp/kulti_restore_$(date +%s).sql"
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
  RESTORE_FILE="$TEMP_FILE"
else
  RESTORE_FILE="$BACKUP_FILE"
fi

# Perform restore
echo -e "${YELLOW}Starting database restore...${NC}"
echo "This may take several minutes..."
echo ""

PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h "db.${SUPABASE_PROJECT_REF}.supabase.co" \
  -U postgres \
  -d postgres \
  -f "$RESTORE_FILE" \
  --quiet

# Clean up temp file
if [ -n "$TEMP_FILE" ]; then
  rm -f "$TEMP_FILE"
fi

# Check if restore was successful
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}=== Restore Complete ===${NC}"
  echo -e "${GREEN}✓ Database restored successfully!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Verify data integrity"
  echo "2. Test critical functionality"
  echo "3. Check RLS policies are active"
  echo "4. Restart application if needed"
  echo ""
else
  echo -e "${RED}✗ Restore failed!${NC}"
  exit 1
fi
