#!/usr/bin/env node

/**
 * Find orphaned scans (not connected to any user)
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE env vars");
  console.error(`URL: ${supabaseUrl ? "✅" : "❌"}`);
  console.error(`Key: ${serviceKey ? "✅" : "❌"}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("🔍 ORPHANED SCANS ANALYSIS\n");

  // Step 1: Get all scans
  const { data: allScans, error: scansError } = await supabase
    .from("user_analyses")
    .select("id, user_id");

  if (scansError) {
    console.error(`❌ Error fetching scans: ${scansError.message}`);
    process.exit(1);
  }

  console.log(`📊 Total scans in database: ${allScans.length}\n`);

  // Step 2: Get all user UUIDs
  const { data: allProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id");

  if (profilesError) {
    console.error(`❌ Error fetching profiles: ${profilesError.message}`);
    process.exit(1);
  }

  const validUserIds = new Set(allProfiles.map((p) => p.id));
  console.log(`👥 Total users in profiles table: ${validUserIds.size}\n`);

  // Step 3: Find orphaned scans
  const orphanedScans = allScans.filter((scan) => !validUserIds.has(scan.user_id));

  console.log(`❌ ORPHANED SCANS: ${orphanedScans.length}\n`);

  if (orphanedScans.length > 0) {
    console.log("Orphaned scan UUIDs:");
    const orphanedUserIds = new Set(orphanedScans.map((s) => s.user_id));
    orphanedUserIds.forEach((uuid) => {
      const count = orphanedScans.filter((s) => s.user_id === uuid).length;
      console.log(`  - ${uuid}: ${count} scans`);
    });
  }

  // Step 4: Scan distribution by user
  console.log("\n📋 SCAN DISTRIBUTION BY USER:\n");

  const scansByUser = {};
  allScans.forEach((scan) => {
    if (!scansByUser[scan.user_id]) {
      scansByUser[scan.user_id] = [];
    }
    scansByUser[scan.user_id].push(scan.id);
  });

  const distribution = Object.entries(scansByUser)
    .map(([uid, ids]) => ({ uid, count: ids.length }))
    .sort((a, b) => b.count - a.count);

  console.log("Top 10 users by scan count:");
  distribution.slice(0, 10).forEach((d, i) => {
    const isOrphaned = !validUserIds.has(d.uid) ? " ❌ ORPHANED" : " ✅";
    console.log(`  ${i + 1}. ${d.uid}: ${d.count} scans${isOrphaned}`);
  });

  // Step 5: Summary
  console.log("\n📈 SUMMARY:\n");
  console.log(`Total scans: ${allScans.length}`);
  console.log(`Connected to users: ${allScans.length - orphanedScans.length}`);
  console.log(`Orphaned (no user): ${orphanedScans.length}`);
  console.log(
    `Orphaned percentage: ${((orphanedScans.length / allScans.length) * 100).toFixed(1)}%`
  );

  // Step 6: Check specific UUIDs
  console.log("\n🔎 ADUPASS UUID STATUS:\n");

  const adupassUUID1 = "4efb5df3-ce0a-40f6-ae13-6defa1610d3a"; // validation map
  const adupassUUID2 = "c4290c36-e068-4659-b42b-f62cdc8e4f0a"; // fingerprint file
  const adupassScans1 = allScans.filter((s) => s.user_id === adupassUUID1);
  const adupassScans2 = allScans.filter((s) => s.user_id === adupassUUID2);

  console.log(
    `Scans for UUID 4efb5df3... (validation map): ${adupassScans1.length}`
  );
  console.log(
    `Scans for UUID c4290c36... (fingerprint file): ${adupassScans2.length}`
  );

  if (adupassScans1.length > 0 || adupassScans2.length > 0) {
    console.log("\n✅ Adupass has scans! They are split between 2 UUIDs.");
  }

  if (orphanedScans.length === 0) {
    console.log(
      "\n✅ Great news! All scans are connected to valid users."
    );
  } else {
    console.log(`\n⚠️  WARNING: ${orphanedScans.length} scans have no associated user!`);
  }
}

main().catch(console.error);
