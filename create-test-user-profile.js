#!/usr/bin/env node

/**
 * Create a profile for the test user
 * Usage: SUPABASE_SERVICE_ROLE_KEY="..." node create-test-user-profile.js
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mzprefkjpyavwbtkebqj.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = "14475cb2-1e28-4e14-a652-d710c9cac671";
const TEST_EMAIL = "test.user@skinlytix.dev";

async function createProfile() {
  try {
    console.log("Creating profile for test user...");
    console.log(`User ID: ${TEST_USER_ID}`);
    console.log(`Email: ${TEST_EMAIL}`);

    // Check if profile already exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", TEST_USER_ID)
      .single();

    if (existing) {
      console.log("✅ Profile already exists for this user");
      return;
    }

    // Create profile
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        subscription_tier: "free",
        trial_ends_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("❌ Error creating profile:", error.message);
      process.exit(1);
    }

    console.log("\n✅ Profile created successfully!");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

createProfile();
