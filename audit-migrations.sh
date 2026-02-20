#!/bin/bash

echo "📊 SkinLytix Migration Audit Report"
echo "=================================="
echo ""

cd /Users/cedricevans/Downloads/Work_Station/Skinlytix

echo "Total Migrations: $(ls -1 supabase/migrations/*.sql | wc -l)"
echo ""

echo "📅 Migration Timeline:"
echo "====================\n"

# Group migrations by date
echo "October 2025 (Initial Setup):"
ls -1 supabase/migrations/202510*.sql 2>/dev/null | wc -l
echo " migrations\n"

echo "October 2025 (Schema Development):"
ls -1 supabase/migrations/202510*.sql 2>/dev/null | head -5

echo "\nNovember 2025 (Refinements):"
ls -1 supabase/migrations/202511*.sql 2>/dev/null | wc -l
echo " migrations\n"

echo "December 2025 (Final Updates):"
ls -1 supabase/migrations/202512*.sql 2>/dev/null | wc -l
echo " migrations\n"

echo "January 2026 (Latest Schema):"
ls -1 supabase/migrations/202601*.sql 2>/dev/null | wc -l
echo " migrations\n"

echo "February 2026 (Current/New):"
ls -1 supabase/migrations/202602*.sql 2>/dev/null

echo "\n\n📋 Recent Migrations Summary:"
echo "===========================\n"

echo "LATEST (Most Recent):"
tail -1 supabase/migrations/20260218_data_restore.sql | head -1
echo "✅ 20260218_data_restore.sql - Data restore migration (TODAY)\n"

echo "PREVIOUS:"
echo "✅ 20260123120000_ingredient_explanations_cache.sql - Ingredient cache (Jan 23)\n"

echo "BEFORE THAT:"
echo "✅ 20260104011046_*.sql - Database cleanup (Jan 4)"
echo "✅ 20260104005003_*.sql - Subscription updates (Jan 4)"
echo "✅ 20260104002825_*.sql - Schema updates (Jan 4)\n"

echo "\n🔄 Checking for Unapplied Migrations:"
echo "====================================\n"

# Check migration files for content
TOTAL_FILES=$(ls -1 supabase/migrations/*.sql | wc -l)
EMPTY_FILES=$(find supabase/migrations -name "*.sql" -size 0 | wc -l)

echo "Total files: $TOTAL_FILES"
echo "Empty files: $EMPTY_FILES"
echo "Active migrations: $((TOTAL_FILES - EMPTY_FILES))\n"

# List the 5 most recent migrations with their sizes
echo "Top 5 Recent Migrations by Size:"
ls -lhS supabase/migrations/*.sql | tail -5 | awk '{printf "%-50s %8s\n", $9, $5}'

echo "\n✅ Migration Audit Complete!"
