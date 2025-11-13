#!/bin/bash

###############################################################################
# Kulti Database Backup Script
###############################################################################
# This script creates a full backup of the Supabase PostgreSQL database.
#
# Usage:
#   ./scripts/backup-db.sh [output_directory]
#
# Requirements:
#   - Supabase CLI installed (npm install -g supabase)
#   - SUPABASE_PROJECT_REF environment variable set
#   - SUPABASE_ACCESS_TOKEN environment variable set
#   - pg_dump installed (comes with PostgreSQL)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="kulti_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Verify required environment variables
if [ -z "$SUPABASE_PROJECT_REF" ]; then
  echo -e "${RED}Error: SUPABASE_PROJECT_REF environment variable not set${NC}"
  echo "Set it with: export SUPABASE_PROJECT_REF=your_project_ref"
  exit 1
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo -e "${RED}Error: SUPABASE_DB_PASSWORD environment variable not set${NC}"
  echo "Get it from: https://app.supabase.com/project/$SUPABASE_PROJECT_REF/settings/database"
  exit 1
fi

# Create backup directory if it doesn't exist
echo -e "${YELLOW}Creating backup directory: ${BACKUP_DIR}${NC}"
mkdir -p "$BACKUP_DIR"

# Display backup information
echo -e "${GREEN}=== Kulti Database Backup ===${NC}"
echo "Project: $SUPABASE_PROJECT_REF"
echo "Timestamp: $TIMESTAMP"
echo "Backup file: $BACKUP_PATH"
echo ""

# Perform backup using pg_dump
echo -e "${YELLOW}Starting database backup...${NC}"

PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  -h "db.${SUPABASE_PROJECT_REF}.supabase.co" \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=plain \
  --file="$BACKUP_PATH"

# Check if backup was successful
if [ $? -eq 0 ]; then
  # Get backup file size
  BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

  echo -e "${GREEN}✓ Backup completed successfully!${NC}"
  echo "File: $BACKUP_PATH"
  echo "Size: $BACKUP_SIZE"

  # Compress backup
  echo -e "${YELLOW}Compressing backup...${NC}"
  gzip "$BACKUP_PATH"
  COMPRESSED_SIZE=$(du -h "${BACKUP_PATH}.gz" | cut -f1)

  echo -e "${GREEN}✓ Backup compressed!${NC}"
  echo "Compressed file: ${BACKUP_PATH}.gz"
  echo "Compressed size: $COMPRESSED_SIZE"

  # Create checksum
  CHECKSUM=$(shasum -a 256 "${BACKUP_PATH}.gz" | cut -d' ' -f1)
  echo "$CHECKSUM" > "${BACKUP_PATH}.gz.sha256"

  echo -e "${GREEN}✓ Checksum created: ${BACKUP_PATH}.gz.sha256${NC}"
  echo ""

  # Display instructions
  echo -e "${GREEN}=== Backup Complete ===${NC}"
  echo "To restore this backup, run:"
  echo "  ./scripts/restore-db.sh ${BACKUP_PATH}.gz"
  echo ""
  echo "To verify checksum:"
  echo "  shasum -a 256 -c ${BACKUP_PATH}.gz.sha256"
  echo ""

  # Clean up old backups (keep last 7 days)
  echo -e "${YELLOW}Cleaning up old backups (older than 7 days)...${NC}"
  find "$BACKUP_DIR" -name "kulti_backup_*.sql.gz" -type f -mtime +7 -delete
  find "$BACKUP_DIR" -name "kulti_backup_*.sql.gz.sha256" -type f -mtime +7 -delete

  echo -e "${GREEN}✓ Cleanup complete${NC}"

else
  echo -e "${RED}✗ Backup failed!${NC}"
  exit 1
fi
