import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
dotenv.config({ path: path.join(__dirname, ".env.local") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("📊 Loading and executing data restore SQL...\n");

const sqlPath = path.join(__dirname, "supabase/migrations/20260218_data_restore.sql");
const sql = await fs.readFile(sqlPath, "utf-8");

try {
  const { data, error } = await supabase.rpc("exec_sql", {
    sql_query: sql,
  });

  if (error) {
    console.error("❌ Error executing SQL:", error.message);
    console.log("\n⚠️  Note: If 'exec_sql' function doesn't exist, we'll use the SQL Editor approach.\n");
    console.log("Manual steps:");
    console.log("1. Go to https://supabase.com/dashboard/project/mzprefkjpyavwbtkebqj/sql");
    console.log("2. Click 'New query'");
    console.log("3. Copy and paste the contents of supabase/migrations/20260218_data_restore.sql");
    console.log("4. Click 'Run'");
  } else {
    console.log("✅ Data restore SQL executed successfully!");
    console.log(data);
  }
} catch (err) {
  console.error("❌ Exception:", err.message);
  console.log("\n📋 To restore data manually:");
  console.log("1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/mzprefkjpyavwbtkebqj/sql");
  console.log("2. Create a new query and copy/paste the SQL from supabase/migrations/20260218_data_restore.sql");
  console.log("3. Execute the query");
}
