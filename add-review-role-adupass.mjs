#!/usr/bin/env node
/**
 * ADD REVIEW ROLE TO ADUPASS
 * 
 * Adupass needs BOTH admin + review roles to access /dashboard/reviewer.
 * Currently has only admin role, missing review role.
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

const ADUPASS_UUID = "4efb5df3-ce0a-40f6-ae13-6defa1610d3a";

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║         ADD REVIEW ROLE TO ADUPASS                         ║");
console.log("║  UUID: 4efb5df3-ce0a-40f6-ae13-6defa1610d3a                 ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

async function addReviewRole() {
  try {
    // Check current roles
    console.log("📋 Checking current roles for Adupass...\n");

    const { data: currentRoles, error: fetchError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", ADUPASS_UUID);

    if (fetchError) {
      console.error("❌ Error fetching roles:", fetchError);
      process.exit(1);
    }

    console.log(`  Current roles: ${currentRoles.length}`);
    currentRoles.forEach((role) => {
      console.log(`    • ${role.role} (created: ${role.created_at})`);
    });

    // Check if review role already exists
    const hasReviewRole = currentRoles.some((r) => r.role === "review");
    const hasAdminRole = currentRoles.some((r) => r.role === "admin");

    console.log(`\n  Has admin role: ${hasAdminRole ? "✅" : "❌"}`);
    console.log(`  Has review role: ${hasReviewRole ? "✅" : "❌"}\n`);

    if (hasReviewRole) {
      console.log(
        "✅ Adupass already has review role! No action needed.\n"
      );
      return;
    }

    // Add review role
    console.log("🔧 Adding review role...\n");

    const { data: insertedRole, error: insertError } = await supabase
      .from("user_roles")
      .insert([
        {
          user_id: ADUPASS_UUID,
          role: "review",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (insertError) {
      console.error("❌ Error adding role:", insertError);
      process.exit(1);
    }

    console.log("✅ Review role added successfully!\n");

    // Verify final state
    console.log("📋 Final role state:\n");

    const { data: finalRoles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", ADUPASS_UUID);

    finalRoles.forEach((role) => {
      console.log(`  ✅ ${role.role} role`);
    });

    console.log(`\n🎉 SUCCESS! Adupass now has ${finalRoles.length} roles (admin + review)\n`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

addReviewRole();
