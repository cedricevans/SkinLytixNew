import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
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

console.log("🔍 Checking Supabase database tables...\n");

// Query information schema to get all tables
const { data, error } = await supabase.rpc("get_tables", {});

if (error) {
  // Fallback: query using raw SQL
  const { data: tables, error: tablesError } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");

  if (tablesError) {
    console.log(
      "ℹ️  Using Supabase introspection to get table list...\n"
    );
  }
}

// Check specific core tables
const coreTables = [
  "profiles",
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
  "academic_institutions",
  "student_certifications",
  "expert_reviews",
  "ingredient_validations",
  "ingredient_explanations_cache",
  "user_roles",
  "user_badges",
  "stripe_customers",
  "stripe_subscriptions",
];

console.log("Checking core tables:\n");

for (const tableName of coreTables) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      if (error.code === "PGRST116") {
        console.log(`❌ ${tableName.padEnd(40)} - TABLE NOT FOUND`);
      } else {
        console.log(
          `⚠️  ${tableName.padEnd(40)} - ERROR: ${error.message}`
        );
      }
    } else {
      console.log(
        `✅ ${tableName.padEnd(40)} - EXISTS (${count || 0} rows)`
      );
    }
  } catch (err) {
    console.log(
      `❌ ${tableName.padEnd(40)} - EXCEPTION: ${err.message}`
    );
  }
}

console.log("\n\n📊 Checking data in key tables:\n");

// Check profiles table
const { data: profiles, count: profileCount } = await supabase
  .from("profiles")
  .select("id, email, display_name, subscription_tier", { count: "exact" });

console.log(`📋 Profiles: ${profileCount} total`);
if (profiles && profiles.length > 0) {
  console.log(`   Sample profiles:`);
  profiles.slice(0, 3).forEach((p) => {
    console.log(
      `   - ${p.email} (${p.display_name || "No name"}) - ${p.subscription_tier || "free"}`
    );
  });
}

// Check user_analyses table
const { count: analysesCount } = await supabase
  .from("user_analyses")
  .select("*", { count: "exact", head: true });

console.log(`\n📊 User Analyses: ${analysesCount} total`);

// Check routines table
const { count: routinesCount } = await supabase
  .from("routines")
  .select("*", { count: "exact", head: true });

console.log(`\n📋 Routines: ${routinesCount} total`);

// Check chat_conversations table
const { count: chatsCount } = await supabase
  .from("chat_conversations")
  .select("*", { count: "exact", head: true });

console.log(`\n💬 Chat Conversations: ${chatsCount} total`);

// Check saved_dupes table
const { count: dupesCount } = await supabase
  .from("saved_dupes")
  .select("*", { count: "exact", head: true });

console.log(`\n🔄 Saved Dupes: ${dupesCount} total`);

console.log("\n✅ Database verification complete!");
