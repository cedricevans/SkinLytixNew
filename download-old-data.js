import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration for OLD database (yflbjaetupvakadqjhfb)
const OLD_SUPABASE_URL = "https://yflbjaetupvakadqjhfb.supabase.co";
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_SUPABASE_KEY) {
  console.error("❌ Error: OLD_SUPABASE_SERVICE_ROLE_KEY not set in environment");
  console.log("\nTo use this script:");
  console.log("1. Get the service role key from: https://supabase.com/dashboard/project/yflbjaetupvakadqjhfb/settings/api");
  console.log("2. Set it: export OLD_SUPABASE_SERVICE_ROLE_KEY='your-key-here'");
  console.log("3. Run: node download-old-data.js");
  process.exit(1);
}

const supabaseOld = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Tables to export in foreign-key-safe order
const TABLES_IN_ORDER = [
  "academic_institutions",
  "user_roles",
  "profiles",
  "products",
  "product_ingredients",
  "ingredient_cache",
  "product_cache",
  "user_analyses",
  "routines",
  "routine_products",
  "routine_optimizations",
  "saved_dupes",
  "chat_conversations",
  "chat_messages",
  "feedback",
  "beta_feedback",
  "user_events",
  "usage_limits",
  "student_certifications",
  "expert_reviews",
  "ingredient_validations",
  "ingredient_explanations_cache",
  "user_badges",
  "stripe_customers",
  "stripe_subscriptions",
];

async function exportTableAsJSON(supabase, tableName, limit = 1000) {
  let allData = [];
  let page = 0;

  while (true) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .range(page * limit, (page + 1) * limit - 1);

      if (error) {
        console.warn(`⚠️  Table ${tableName}: ${error.message}`);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allData = allData.concat(data);
      page++;

      if (data.length < limit) {
        break;
      }
    } catch (err) {
      console.warn(`⚠️  Exception fetching ${tableName}:`, err.message);
      break;
    }
  }

  return allData;
}

function generateSQLInsert(tableName, rows) {
  if (rows.length === 0) {
    return `-- No data for ${tableName}\n`;
  }

  const columns = Object.keys(rows[0]);
  const columnList = columns.join(", ");

  const values = rows
    .map((row) => {
      const vals = columns.map((col) => {
        const val = row[col];
        if (val === null) {
          return "NULL";
        }
        if (typeof val === "string") {
          return `'${val.replace(/'/g, "''")}'`;
        }
        if (typeof val === "boolean") {
          return val ? "true" : "false";
        }
        if (typeof val === "object") {
          return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        }
        return String(val);
      });
      return `(${vals.join(", ")})`;
    })
    .join(",\n  ");

  return `INSERT INTO ${tableName} (${columnList}) VALUES\n  ${values}\n  ON CONFLICT DO NOTHING;\n`;
}

async function downloadData() {
  console.log("📥 Downloading data from old Supabase project...");
  console.log(`📍 Source: ${OLD_SUPABASE_URL}\n`);

  // Create export directory
  const exportDir = path.join(__dirname, "old-database-export");
  await fs.mkdir(exportDir, { recursive: true });

  const timestamp = new Date().toISOString().split("T")[0];
  const sqlFile = path.join(exportDir, `old-data-${timestamp}.sql`);
  const jsonFile = path.join(exportDir, `old-data-${timestamp}.json`);

  let sqlOutput = "-- SkinLytix Old Database Export\n";
  sqlOutput += `-- Generated: ${new Date().toISOString()}\n`;
  sqlOutput += "-- Source: yflbjaetupvakadqjhfb.supabase.co\n";
  sqlOutput += "-- Import into: mzprefkjpyavwbtkebqj.supabase.co\n";
  sqlOutput += "-- Run this in Supabase SQL Editor\n\n";
  sqlOutput += "BEGIN;\n\n";

  const jsonExport = {};
  let totalRecords = 0;

  for (const tableName of TABLES_IN_ORDER) {
    console.log(`⏳ Exporting ${tableName}...`);
    try {
      const data = await exportTableAsJSON(supabaseOld, tableName);
      jsonExport[tableName] = data;
      totalRecords += data.length;

      sqlOutput += `-- Table: ${tableName} (${data.length} rows)\n`;
      sqlOutput += generateSQLInsert(tableName, data);
      sqlOutput += "\n";

      console.log(`   ✅ ${tableName}: ${data.length} rows`);
    } catch (error) {
      console.log(`   ❌ ${tableName}: ${error.message}`);
      sqlOutput += `-- Error exporting ${tableName}: ${error.message}\n`;
      jsonExport[tableName] = [];
    }
  }

  sqlOutput += "COMMIT;\n";

  // Save SQL file
  await fs.writeFile(sqlFile, sqlOutput);
  console.log(`\n✅ SQL export saved to: ${sqlFile}`);

  // Save JSON file
  await fs.writeFile(jsonFile, JSON.stringify(jsonExport, null, 2));
  console.log(`✅ JSON export saved to: ${jsonFile}`);

  console.log(`\n📊 Total records exported: ${totalRecords}\n`);

  console.log("📋 Next Steps:");
  console.log("1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/mzprefkjpyavwbtkebqj/sql");
  console.log("2. Create a new query and paste the contents of:");
  console.log(`   ${path.relative(process.cwd(), sqlFile)}`);
  console.log("3. Click 'Run' to import the data into the new project");
  console.log("\nOr use the export-data edge function to download via browser:");
  console.log("const { data: { session } } = await supabase.auth.getSession();");
  console.log("fetch('https://mzprefkjpyavwbtkebqj.supabase.co/functions/v1/export-data?format=sql', {");
  console.log("  headers: { 'Authorization': `Bearer ${session.access_token}` }");
  console.log("}).then(r => r.blob()).then(blob => { /* download blob */ });");
}

downloadData().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
