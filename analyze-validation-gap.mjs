#!/usr/bin/env node
/**
 * ANALYZE VALIDATION GAP
 * 
 * Compare current database state against the authoritative validation map.
 * Shows exactly which users need scan reassignment and which scans are missing.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// VALIDATION MAP - From migration-validation-map.md
const VALIDATION_MAP = {
  "4efb5df3-ce0a-40f6-ae13-6defa1610d3a": { name: "Adupass", scans: 70 },
  "1efb1396-aa1e-419c-8ba2-1b6366143783": { name: "Test User", scans: 4 },
  "002235e1-89ca-4524-a4b4-7f3553d023ce": { name: "Skylar Farmer", scans: 1 },
  "5880857f-ef2b-4b83-834f-5a312ee67152": { name: "Neekahgee", scans: 0 },
  "69a15571-b5e7-4417-90fe-ef1039e2c6a7": { name: "Kevin", scans: 1 },
  "e02f0cae-fe80-4066-adf9-d67225abc3d4": { name: "Sem", scans: 0 },
  "f8330e90-48bb-431e-b64e-b71866305698": { name: "Denae", scans: 2 },
  "431d1313-0264-4315-8820-e815ce651170": { name: "Paul", scans: 0 },
  "c4feb2ce-5a3f-47c2-9b87-058d110e6ce7": { name: "Elvia Dupass", scans: 3 },
  "02484e4b-b2dd-4c13-9879-65df2995b579": { name: "A3", scans: 0 },
  "8534f2c2-24fb-4d55-a99e-1864f058eb97": { name: "Test user", scans: 2 },
  "4d732879-4cfa-49c1-8b6a-328e707a0428": { name: "James", scans: 24 },
  "f87f24a9-30a4-4367-ad56-6674f9642dc8": { name: "So_ICy", scans: 3 },
  "5ca997e4-9613-49d4-ab4f-ff56464127a6": { name: "Alton (test)", scans: 1 },
  "7d88a687-a996-4b58-ab5f-a60f0648ceff": { name: "daniele", scans: 1 },
  "01a3e2bf-65f8-4395-ae05-c8609cf28dcf": { name: "Kevin", scans: 1 },
  "21f8419c-671c-4e13-a8cf-15c099e6b702": { name: "Angela", scans: 0 },
  "ed1ca66f-4cf0-4d6f-8db4-87012cbc3ddf": { name: "Kandace Bridges", scans: 3 },
  "d26626ba-cd39-47f0-9347-67642bffd452": { name: "LIV WILSON", scans: 1 },
  "a74a5827-731c-4e0b-a2ba-ab19a867f76b": { name: "Victor", scans: 0 },
  "198309c8-8802-47f7-9839-3cce2c8d05f7": { name: "Chris \"CT\" Thomas", scans: 0 },
  "fc196879-6d44-42c4-a17b-740d9200fe52": { name: "Courtney Sumpter", scans: 0 },
  "9ee9e215-b981-4869-9486-0fda6a8f4925": { name: "Tres", scans: 0 },
  "8bfa87b4-c056-4daa-ad9b-bddeede986f3": { name: "Khec_", scans: 0 },
  "bb48eb0a-83ef-4e4d-8732-2ec88712397b": { name: "TcMiles", scans: 0 },
  "80399f65-b72d-4111-8aaf-7d101d724c4a": { name: "NateParker", scans: 3 },
  "a62e50b1-9611-4952-aa8e-074373bd7134": { name: "Milly Figuereo", scans: 1 },
  "3871787a-f143-4a06-8425-ee3d98edfde0": { name: "Jamie", scans: 1 },
  "2596e354-cde3-4045-87dd-f4aa815f44a2": { name: "Test User 3", scans: 2 },
  "512f5664-03c8-4604-b912-f045c946a352": { name: "Ebony J", scans: 0 },
  "86b3f49a-2113-4981-9cd5-cb222ad03fe1": { name: "Christina Branch", scans: 9 },
  "5974c70a-9ee6-4907-9244-107ad4271372": { name: "Optimus", scans: 1 },
  "1b530127-2966-47b3-9743-daa8c8e089a8": { name: "gtjumperzo", scans: 0 },
  "0d47b715-e7ec-428c-81e6-586bbd202f91": { name: "DXD", scans: 0 },
  "b35ff543-4919-4604-8f11-3effc991ffb3": { name: "Shanelle", scans: 1 },
  "f8641708-edd7-48c7-987d-c5a29df85326": { name: "Lorna", scans: 0 },
  "b9338781-e5f9-49c1-8ee5-583f2117d357": { name: "Thechloebrand", scans: 0 },
  "8c1d419a-a50a-4810-9f6a-80a3a5d8be71": { name: "Becky", scans: 0 },
  "66e520a5-fc74-456a-8e8d-fef5339875ec": { name: "Arica Ratcliff", scans: 0 },
  "7f226ed2-9623-4bca-a473-5ecf31389e2e": { name: "Kevin", scans: 1 },
  "c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be": { name: "Christina Whiten", scans: 4 },
  "d67f34ee-650b-4f5a-818c-86d699c5252a": { name: "Nee", scans: 2 },
  "625b088e-5977-4203-8d7b-27d3ca2ae27b": { name: "Milly Figuereo", scans: 4 },
  "c2ac2da8-acc0-48c0-a7cb-51f96c56f327": { name: "Dina", scans: 0 },
  "7d2fac66-0c35-4e8b-8a06-e3430e87c85b": { name: "Traviaun", scans: 0 },
  "26348ac5-dbfc-4a17-80ca-b0a79ab05084": { name: "Mirian", scans: 0 },
  "4e3c3de3-62f2-462d-818d-78d16dfe4c93": { name: "Candice Martin", scans: 0 },
  "682e9c56-2d14-4cf0-b874-6596b0ef1a60": { name: "Anthony", scans: 1 },
  "543ad727-efaf-4964-b4c6-cf7cb431657d": { name: "Darlene Robinson", scans: 0 },
  "edf703c1-3d54-4092-b80e-f11dea1ef40c": { name: "Ashley Montes", scans: 0 },
  "1b0b1f16-aa8f-4679-a127-ba094eea3524": { name: "Kreeves88", scans: 0 },
  "3b44e62c-c194-4dda-8b4d-70874139318e": { name: "Dub", scans: 0 },
  "a3de44aa-d650-4b02-b46e-c452827112b4": { name: "Amerie.Whiten", scans: 0 },
  "6e8995ac-7f8d-4341-b59c-ea0741259f5a": { name: "Taylor", scans: 0 },
  "181cb709-a11b-411e-acbb-5e32a33c31c7": { name: "Traejrc", scans: 5 },
  "1216d737-ce6e-4b85-ac38-ec16c9ac6c50": { name: "Itzzaly", scans: 0 },
  "356b550b-87d4-468c-879e-4d529a98ee91": { name: "gteurika", scans: 0 },
  "fafddd84-9740-4789-a215-78e5c1d8cddc": { name: "Kim", scans: 1 },
  "b56a05ad-cc29-4c51-9778-c2f1d8d769f9": { name: "Sandra", scans: 1 },
  "e039d423-aca3-45a9-8852-b572c65cbb75": { name: "Stacey", scans: 0 },
  "a116901f-7d76-44d2-97e0-4d140a3d7333": { name: "Tiffany", scans: 1 },
  "efbe63bc-6d9f-47b2-a4a6-b3a687c8618f": { name: "Tameka R", scans: 1 },
  "c3a94f39-6841-4b8a-8521-02185a573b8a": { name: "Chenae", scans: 3 },
  "14a16c5f-5afb-4443-855b-7711d13eab6f": { name: "Zay", scans: 0 },
  "8e6ca83d-b7e8-4d46-8af0-e2910676210a": { name: "Rhonda Gist", scans: 1 },
  "5f9ef85f-3d28-4024-948d-89d9f658886c": { name: "Samantha Miller", scans: 0 },
  "6b7d62fb-7c3d-4fde-918f-26c937261e2e": { name: "Morgan Riley", scans: 0 },
  "bbe9a7bf-cbd3-4dce-84c7-e2a9782af92a": { name: "Stacey", scans: 3 },
  "45d28611-5076-431e-9236-bbd5f806c414": { name: "Ken87", scans: 1 },
  "3442d1fc-939b-4076-ad3b-0f908be2ce43": { name: "Ryhill", scans: 0 },
  "80c09810-7a89-4c4f-abc5-8f59036cd080": { name: "Cedric", scans: 25 },
  "890229b4-8fba-4521-9989-5483dcee62f7": { name: "Darye", scans: 0 },
  "2a492020-7e11-4bf2-a028-590b07538859": { name: "P Evans", scans: 3 },
  "5e93f015-e9ce-45aa-bc2c-ecfdbfbd6027": { name: "Stacey Suarez", scans: 0 },
  "64132369-513f-4bd4-982c-e9c31c5a01d9": { name: "Test - Free", scans: 4 },
  "b9eb3aa9-49e2-4e70-92ea-a23d35de53f5": { name: "Patrick E", scans: 0 },
  "cb4efe71-632f-4f0c-831e-96e9b12a708e": { name: "Ced", scans: 2 },
  "8963c7a4-a1bb-4f04-8145-84654e63bc84": { name: "Csg11779", scans: 3 },
};

const EXPECTED_TOTAL = 201; // From validation map

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║         VALIDATION GAP ANALYSIS                             ║");
console.log("║  Current State vs Authoritative Migration Validation Map    ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

async function analyzeGap() {
  try {
    // Get current scan distribution
    const { data: scans, error: scanError } = await supabase
      .from("user_analyses")
      .select("user_id");

    if (scanError) {
      console.error("❌ Error fetching scans:", scanError);
      process.exit(1);
    }

    // Count scans per user
    const currentDistribution = {};
    scans.forEach((scan) => {
      currentDistribution[scan.user_id] =
        (currentDistribution[scan.user_id] || 0) + 1;
    });

    const totalCurrentScans = scans.length;
    const missingScans = EXPECTED_TOTAL - totalCurrentScans;

    // Compare with validation map
    console.log("📊 SCAN COUNT COMPARISON:\n");
    console.log(
      `  Expected (from validation map): ${EXPECTED_TOTAL} scans`
    );
    console.log(`  Current (in database):         ${totalCurrentScans} scans`);
    console.log(
      `  Permanently missing:            ${missingScans} scans (${((missingScans / EXPECTED_TOTAL) * 100).toFixed(1)}%)\n`
    );

    // Analyze per-user differences
    console.log("⚠️  PER-USER DISTRIBUTION ANALYSIS:\n");

    const wrong = [];
    const correct = [];

    Object.entries(VALIDATION_MAP).forEach(([uuid, expected]) => {
      const actual = currentDistribution[uuid] || 0;

      if (actual === expected.scans) {
        correct.push({
          uuid,
          name: expected.name,
          scans: expected.scans,
        });
      } else {
        wrong.push({
          uuid,
          name: expected.name,
          expected: expected.scans,
          actual,
          diff: actual - expected.scans,
        });
      }
    });

    // Show wrong distributions
    if (wrong.length > 0) {
      console.log(`❌ USERS WITH WRONG SCAN COUNTS (${wrong.length} users):\n`);

      // Sort by difference (descending)
      wrong.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

      wrong.slice(0, 20).forEach((w) => {
        const status =
          w.actual > w.expected
            ? `+${w.diff} extra`
            : `${w.diff} missing`;
        console.log(
          `  • ${w.name.padEnd(25)} UUID: ${w.uuid.slice(0, 8)}...`
        );
        console.log(
          `    Expected: ${String(w.expected).padEnd(3)} | Actual: ${String(w.actual).padEnd(3)} | ${status}\n`
        );
      });

      if (wrong.length > 20) {
        console.log(`  ... and ${wrong.length - 20} more users\n`);
      }
    }

    console.log(`✅ USERS WITH CORRECT SCAN COUNTS (${correct.length} users):\n`);
    correct.slice(0, 10).forEach((c) => {
      console.log(`  • ${c.name.padEnd(25)} ${c.scans} scans ✓`);
    });
    if (correct.length > 10) {
      console.log(`  ... and ${correct.length - 10} more users`);
    }

    // Key findings
    console.log("\n\n🔍 KEY FINDINGS:\n");

    const overage = wrong.filter((w) => w.actual > w.expected);
    const shortage = wrong.filter((w) => w.actual < w.expected);

    console.log(
      `1. Round-Robin Impact: ${wrong.length} users have wrong scan counts`
    );
    console.log(`   - ${overage.length} users have MORE scans than expected`);
    console.log(`   - ${shortage.length} users have FEWER scans than expected`);

    // Calculate scan redistribution needed
    const excessScans = overage.reduce((sum, w) => sum + w.diff, 0);
    const shortageScans = shortage.reduce((sum, w) => sum + Math.abs(w.diff), 0);

    console.log(`\n2. Scan Redistribution Required:`);
    console.log(
      `   - Move ${excessScans} scans FROM overallocated users (if excess > shortage)`
    );
    console.log(`   - Add ${shortageScans} scans TO underallocated users`);
    console.log(
      `   - Gap: ${missingScans} scans cannot be redistributed (permanently missing)\n`
    );

    // Critical users
    console.log(`3. CRITICAL USERS STATUS:\n`);
    const criticalUUIDs = [
      "4efb5df3-ce0a-40f6-ae13-6defa1610d3a", // Adupass
      "80c09810-7a89-4c4f-abc5-8f59036cd080", // Cedric
      "4d732879-4cfa-49c1-8b6a-328e707a0428", // James
      "86b3f49a-2113-4981-9cd5-cb222ad03fe1", // Christina Branch
      "2a492020-7e11-4bf2-a028-590b07538859", // P Evans
    ];

    criticalUUIDs.forEach((uuid) => {
      const expected = VALIDATION_MAP[uuid];
      const actual = currentDistribution[uuid] || 0;
      const status = actual === expected.scans ? "✅" : "❌";

      console.log(`   ${status} ${expected.name.padEnd(25)} ${actual}/${expected.scans} scans`);
    });

    console.log("\n");

    // Recovery recommendation
    console.log("💡 RECOVERY PLAN:\n");
    console.log("   1. Reverse round-robin: Restore original UUID→scan mapping");
    console.log(`   2. Identify which ${missingScans} scans are permanently lost`);
    console.log(
      "   3. Add review role to Adupass for dashboard access"
    );
    console.log(
      "   4. Restore dependent data (210 records for Adupass)\n"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

analyzeGap();
