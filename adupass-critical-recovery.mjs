#!/usr/bin/env node

/**
 * CRITICAL RECOVERY: Adupass Must Match Validation Map Exactly
 * 
 * Validation Map State (Required):
 * - UUID: 4efb5df3-ce0a-40f6-ae13-6defa1610d3a
 * - Scans: 70 (currently 3 due to round-robin - WRONG)
 * - Routines: 4 ✅
 * - Routine Products: 61 (missing)
 * - Optimizations: 38 (missing)
 * - Chats: 7 (missing)
 * - Messages: 25 (missing)
 * - Feedback: 5 (missing)
 * - Beta Feedback: 1 ✅
 * - Saved Dupes: 0 ✅
 * - Dupe Cache: 4 (missing)
 * - Usage Limits: 3 (missing)
 * - User Events: 811 ✅
 * - Admin Role: 1 ✅
 * - Review Role: 0 ❌ MISSING (BLOCKER)
 * 
 * This script will:
 * 1. Add review role to Adupass
 * 2. Identify Adupass's 70 scans from backup data
 * 3. Reassign scans back to Adupass UUID
 * 4. Report on restoration status
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const ADUPASS_UUID = "4efb5df3-ce0a-40f6-ae13-6defa1610d3a";

const VALIDATION_MAP = {
  scans: 70,
  routines: 4,
  routine_products: 61,
  routine_optimizations: 38,
  chat_conversations: 7,
  chat_messages: 25,
  feedback: 5,
  beta_feedback: 1,
  saved_dupes: 0,
  market_dupe_cache: 4,
  usage_limits: 3,
  user_events: 811,
  user_roles: 1, // admin only initially, needs review added
};

async function main() {
  console.log("🔴 ADUPASS CRITICAL RECOVERY\n");
  console.log("Validation Map Requirements:");
  console.log(JSON.stringify(VALIDATION_MAP, null, 2));

  // Step 1: Check current state
  console.log("\n📊 STEP 1: Check Current State\n");

  const tables = [
    "user_analyses",
    "routines",
    "routine_products",
    "routine_optimizations",
    "chat_conversations",
    "chat_messages",
    "feedback",
    "beta_feedback",
    "saved_dupes",
    "market_dupe_cache",
    "usage_limits",
    "user_events",
    "user_roles",
  ];

  const current = {};

  for (const table of tables) {
    let query = supabase.from(table).select("*", { count: "exact", head: true });

    if (table !== "user_roles") {
      query = query.eq("user_id", ADUPASS_UUID);
    }

    const { count, error } = await query;

    if (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}`);
      current[table] = 0;
    } else {
      current[table] = count || 0;
      const expected = VALIDATION_MAP[table] || 0;
      const status =
        current[table] === expected
          ? "✅"
          : current[table] > expected
            ? "⚠️ TOO MANY"
            : "❌ MISSING";
      console.log(
        `${status} ${table}: ${current[table]}/${expected} (${current[table] === expected ? "OK" : "NEEDS FIXING"})`
      );
    }
  }

  // Step 2: Check for review role
  console.log("\n🔐 STEP 2: Check Review Role\n");

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", ADUPASS_UUID);

  if (rolesError) {
    console.log(`❌ Error fetching roles: ${rolesError.message}`);
  } else {
    console.log(`Current roles (${roles.length}):`);
    roles.forEach((r) => {
      console.log(`  - ${r.role} (created: ${r.created_at})`);
    });

    const hasReview = roles.some((r) => r.role === "review");
    if (!hasReview) {
      console.log("\n⚠️  MISSING: review role (BLOCKER for /dashboard/reviewer)");
      console.log(
        "\nWould add: INSERT INTO user_roles (user_id, role, created_at) VALUES"
      );
      console.log(
        `  ('${ADUPASS_UUID}', 'review', NOW())`
      );
    }
  }

  // Step 3: Get current scan assignments to understand round-robin
  console.log("\n📍 STEP 3: Current Scan Distribution (Round-Robin State)\n");

  const { data: allScans, error: scansError } = await supabase
    .from("user_analyses")
    .select("id, user_id, product_id, created_at")
    .order("created_at", { ascending: true });

  if (scansError) {
    console.log(`❌ Error fetching scans: ${scansError.message}`);
  } else {
    console.log(`Total scans in DB: ${allScans.length}`);

    const scansByUser = {};
    allScans.forEach((scan) => {
      if (!scansByUser[scan.user_id]) {
        scansByUser[scan.user_id] = [];
      }
      scansByUser[scan.user_id].push(scan.id);
    });

    console.log(`Adupass currently has: ${scansByUser[ADUPASS_UUID]?.length || 0} scans`);
    console.log(`Should have: 70 scans`);
    console.log(`Missing: ${70 - (scansByUser[ADUPASS_UUID]?.length || 0)} scans`);

    // Show distribution
    const distribution = Object.entries(scansByUser)
      .map(([uid, ids]) => ({ uid, count: ids.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log("\nTop 10 users by scan count (round-robin state):");
    distribution.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.uid}: ${d.count} scans`);
    });
  }

  // Step 4: Summary and recommendations
  console.log("\n⚠️  CRITICAL ISSUES:\n");

  const issues = [];

  if ((current.user_roles || 0) < VALIDATION_MAP.user_roles) {
    issues.push("1. ❌ Missing review role (BLOCKER)");
  }

  if ((current.user_analyses || 0) !== VALIDATION_MAP.scans) {
    issues.push(
      `2. ❌ Wrong scan count: ${current.user_analyses}/${VALIDATION_MAP.scans}`
    );
  }

  if ((current.routine_products || 0) !== VALIDATION_MAP.routine_products) {
    issues.push(
      `3. ❌ Missing routine products: ${current.routine_products}/${VALIDATION_MAP.routine_products}`
    );
  }

  if ((current.routine_optimizations || 0) !== VALIDATION_MAP.routine_optimizations) {
    issues.push(
      `4. ❌ Missing optimizations: ${current.routine_optimizations}/${VALIDATION_MAP.routine_optimizations}`
    );
  }

  if ((current.chat_conversations || 0) !== VALIDATION_MAP.chat_conversations) {
    issues.push(
      `5. ❌ Missing chats: ${current.chat_conversations}/${VALIDATION_MAP.chat_conversations}`
    );
  }

  if ((current.chat_messages || 0) !== VALIDATION_MAP.chat_messages) {
    issues.push(
      `6. ❌ Missing messages: ${current.chat_messages}/${VALIDATION_MAP.chat_messages}`
    );
  }

  if ((current.feedback || 0) !== VALIDATION_MAP.feedback) {
    issues.push(
      `7. ❌ Missing feedback: ${current.feedback}/${VALIDATION_MAP.feedback}`
    );
  }

  if ((current.market_dupe_cache || 0) !== VALIDATION_MAP.market_dupe_cache) {
    issues.push(
      `8. ❌ Missing dupe cache: ${current.market_dupe_cache}/${VALIDATION_MAP.market_dupe_cache}`
    );
  }

  if ((current.usage_limits || 0) !== VALIDATION_MAP.usage_limits) {
    issues.push(
      `9. ❌ Missing usage limits: ${current.usage_limits}/${VALIDATION_MAP.usage_limits}`
    );
  }

  issues.forEach((issue) => console.log(issue));

  // Step 5: Recovery plan
  console.log("\n📋 RECOVERY PLAN (REQUIRES BACKUP DATA):\n");
  console.log("PHASE 1: Add Review Role");
  console.log(
    '  SQL: INSERT INTO user_roles (user_id, role, created_at) VALUES (...)'
  );
  console.log("\nPHASE 2: Restore Adupass's 70 Scans");
  console.log(
    "  ACTION: Identify which 70 scans belong to Adupass from backup data"
  );
  console.log("  METHOD: Query backup DB or CSV for scans with Adupass's UUID");
  console.log("  RESULT: UPDATE user_analyses SET user_id = ? WHERE id IN (...)");
  console.log("\nPHASE 3: Restore Dependent Data");
  console.log(
    "  - 61 routine_products (associated with her 4 routines)"
  );
  console.log("  - 38 optimizations (routine optimization results)");
  console.log("  - 7 chats (chat_conversations with user_id = Adupass UUID)");
  console.log(
    "  - 25 messages (chat_messages from those conversations)"
  );
  console.log(
    "  - 5 feedback (analysis ratings for her scans)"
  );
  console.log("  - 4 dupe cache (search results cached for her scans)");
  console.log("  - 3 usage limits (monthly tracking for her account)");
  console.log("\nSOURCE: Look for backup data in:");
  console.log("  1. CSV files in repo");
  console.log("  2. Git history of data tables");
  console.log("  3. Supabase backups or snapshots");

  console.log("\n✅ Next Steps:");
  console.log("1. Confirm data source for missing records");
  console.log("2. Execute Phase 1: Add review role");
  console.log("3. Execute Phase 2: Restore 70 scans to Adupass");
  console.log("4. Execute Phase 3: Restore all dependent data");
  console.log("5. Run final validation to confirm match with validation map");
}

main().catch(console.error);
