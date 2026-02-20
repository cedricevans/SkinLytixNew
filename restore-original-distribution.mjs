#!/usr/bin/env node
/**
 * RESTORE ORIGINAL SCAN DISTRIBUTION
 * 
 * Uses the authoritative CSV export to reassign all scans to their correct UUIDs.
 * This reverses the round-robin mistake and restores the original 201-scan distribution.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║       RESTORE ORIGINAL SCAN DISTRIBUTION                   ║");
console.log("║  From: user_analyses-export-2026-02-18_12-45-38.csv         ║");
console.log("║  Target: Reverse round-robin, restore 201-scan distribution ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

async function restoreDistribution() {
  try {
    // Read the CSV file
    console.log("📖 Reading original CSV export...");
    const csvContent = readFileSync(
      "./supabase/user_analyses-export-2026-02-18_12-45-38.csv",
      "utf-8"
    );

    const lines = csvContent.split("\n");
    const header = lines[0];
    const dataLines = lines.slice(1).filter((line) => line.trim());

    // Parse CSV to extract scan IDs and their correct user_ids
    const scanMapping = {}; // scan_id => user_id
    const userScanCount = {}; // user_id => count

    dataLines.forEach((line) => {
      const parts = line.split(";");
      if (parts.length < 2) return;

      const scanId = parts[0]?.trim();
      const userId = parts[1]?.trim();

      // Validate UUID format
      const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

      if (scanId && userId && uuidRegex.test(userId)) {
        scanMapping[scanId] = userId;
        userScanCount[userId] = (userScanCount[userId] || 0) + 1;
      }
    });

    const totalScans = Object.keys(scanMapping).length;

    console.log(`✅ Parsed ${totalScans} scans from CSV\n`);

    // Get current scans from database
    console.log("🔍 Fetching current scans from database...");
    const { data: currentScans, error: fetchError } = await supabase
      .from("user_analyses")
      .select("id, user_id");

    if (fetchError) {
      console.error("❌ Error fetching scans:", fetchError);
      process.exit(1);
    }

    console.log(`✅ Found ${currentScans.length} scans in database\n`);

    // Build update operations
    console.log("🔄 Building restoration plan...\n");

    let updateCount = 0;
    let alreadyCorrect = 0;
    const updateOps = [];

    currentScans.forEach((scan) => {
      const correctUserId = scanMapping[scan.id];

      if (!correctUserId) {
        console.log(`⚠️  Scan ${scan.id.slice(0, 8)}... not in CSV (orphaned?)`);
        return;
      }

      if (scan.user_id === correctUserId) {
        alreadyCorrect++;
      } else {
        updateOps.push({
          id: scan.id,
          currentUser: scan.user_id,
          correctUser: correctUserId,
        });
        updateCount++;
      }
    });

    console.log(`📊 RESTORATION PLAN:\n`);
    console.log(`  • Scans already correct: ${alreadyCorrect}`);
    console.log(`  • Scans needing reassignment: ${updateCount}`);
    console.log(`  • Total scans in database: ${currentScans.length}`);
    console.log(`  • Total scans in CSV: ${totalScans}`);
    console.log(`  • Missing scans (201 expected - database): ${totalScans - currentScans.length}\n`);

    // Show which users are getting corrected
    console.log("📝 TOP CHANGES:\n");

    const changesByUser = {};
    updateOps.forEach((op) => {
      if (!changesByUser[op.correctUser]) {
        changesByUser[op.correctUser] = 0;
      }
      changesByUser[op.correctUser]++;
    });

    Object.entries(changesByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([userId, count]) => {
        console.log(`  • UUID ${userId.slice(0, 8)}...: +${count} scans`);
      });

    console.log();

    // Execute updates
    if (updateCount > 0) {
      console.log(`⚡ Executing ${updateCount} reassignments...\n`);

      let success = 0;
      let errors = 0;

      for (const op of updateOps) {
        const { error } = await supabase
          .from("user_analyses")
          .update({ user_id: op.correctUser })
          .eq("id", op.id);

        if (error) {
          console.error(
            `❌ Failed to update ${op.id.slice(0, 8)}...: ${error.message}`
          );
          errors++;
        } else {
          success++;
        }

        // Progress indicator every 50 updates
        if ((success + errors) % 50 === 0) {
          console.log(
            `  ... ${success + errors}/${updateCount} completed (${errors} errors)`
          );
        }
      }

      console.log(`\n✅ UPDATE COMPLETE:\n`);
      console.log(`  • Successful: ${success}`);
      console.log(`  • Failed: ${errors}\n`);
    }

    // Verify final state
    console.log("📋 FINAL VERIFICATION:\n");

    const { data: finalScans } = await supabase
      .from("user_analyses")
      .select("user_id");

    const finalDistribution = {};
    finalScans.forEach((scan) => {
      finalDistribution[scan.user_id] =
        (finalDistribution[scan.user_id] || 0) + 1;
    });

    // Compare with validation map
    const VALIDATION_MAP = {
      "4efb5df3-ce0a-40f6-ae13-6defa1610d3a": 70, // Adupass
      "80c09810-7a89-4c4f-abc5-8f59036cd080": 25, // Cedric
      "4d732879-4cfa-49c1-8b6a-328e707a0428": 24, // James
      "86b3f49a-2113-4981-9cd5-cb222ad03fe1": 9,  // Christina
      "2a492020-7e11-4bf2-a028-590b07538859": 3,  // P Evans
    };

    console.log("✅ KEY USERS RESTORED:\n");
    let allCorrect = true;

    Object.entries(VALIDATION_MAP).forEach(([uuid, expectedScans]) => {
      const actual = finalDistribution[uuid] || 0;
      const status = actual === expectedScans ? "✅" : "❌";

      console.log(`  ${status} UUID ${uuid.slice(0, 8)}...: ${actual}/${expectedScans}`);

      if (actual !== expectedScans) {
        allCorrect = false;
      }
    });

    console.log();

    if (allCorrect) {
      console.log("🎉 SUCCESS! All key users restored correctly!\n");
    } else {
      console.log("⚠️  Some users still have incorrect scan counts\n");
    }

    console.log(`📊 Total scans after restoration: ${finalScans.length}`);
    console.log(`   Expected: 201\n`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

restoreDistribution();
