#!/bin/bash
# Download data from old Supabase project (yflbjaetupvakadqjhfb)
# and prepare it for import into new project (mzprefkjpyavwbtkebqj)

echo "🔄 Downloading data from old Supabase project..."
echo "Project URL: https://yflbjaetupvakadqjhfb.supabase.co"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found. Please install PostgreSQL tools:"
    echo "   On macOS: brew install postgresql"
    exit 1
fi

# You'll need to provide the connection string
# Format: postgresql://postgres:[password]@[host]:[port]/postgres
# The host is: yflbjaetupvakadqjhfb.supabase.co
# The port is: 5432

read -p "Enter the PostgreSQL password for the old database: " -s PASSWORD
echo ""

OLD_HOST="yflbjaetupvakadqjhfb.supabase.co"
OLD_PORT="5432"
OLD_USER="postgres"
OLD_DB="postgres"

# Create the export directory
mkdir -p ./old-database-export

# Export all tables as SQL
echo "📥 Exporting data..."
PGPASSWORD="$PASSWORD" pg_dump \
  --host="$OLD_HOST" \
  --port="$OLD_PORT" \
  --username="$OLD_USER" \
  --dbname="$OLD_DB" \
  --data-only \
  --no-owner \
  --no-privileges \
  > ./old-database-export/data-export-$(date +%Y-%m-%d).sql

if [ $? -eq 0 ]; then
    echo "✅ Data exported successfully!"
    echo "📄 File saved to: ./old-database-export/data-export-$(date +%Y-%m-%d).sql"
    echo ""
    echo "Next steps:"
    echo "1. Review the SQL file: cat ./old-database-export/data-export-*.sql"
    echo "2. Go to: https://supabase.com/dashboard/project/mzprefkjpyavwbtkebqj/sql"
    echo "3. Create a new query and paste the SQL content"
    echo "4. Click 'Run' to import the data"
else
    echo "❌ Export failed. Check your password and try again."
    exit 1
fi
