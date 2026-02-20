import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const envPath = "/Users/cedricevans/Downloads/Work_Station/Skinlytix/.env";
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_PUBLISHABLE_KEY
);

console.log("🔍 CHECKING CEDRIC'S DATA\n");

// Find cedric's UUID - from the auth export it's 80c09810-7a89-4c4f-abc5-8f59036cd080
const cedricUUID = "80c09810-7a89-4c4f-abc5-8f59036cd080";
const cedricEmail = "cedric.evans@gmail.com";

// Check profile
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", cedricUUID);

console.log(`📋 Profile for ${cedricEmail}:`);
if (profile && profile.length > 0) {
  console.log(`  ✅ Found profile`);
  console.log(JSON.stringify(profile[0], null, 2));
} else {
  console.log(`  ❌ No profile found`);
}

// Check scans
const { data: scans } = await supabase
  .from("user_analyses")
  .select("*")
  .eq("user_id", cedricUUID);

console.log(`\n📊 Scans for ${cedricEmail}:`);
console.log(`  Found: ${scans?.length || 0} scans`);
if (scans && scans.length > 0) {
  console.log(`  First 3 scans:`);
  scans.slice(0, 3).forEach((scan, i) => {
    console.log(`    ${i + 1}. ${scan.product_name}`);
  });
  if (scans.length > 3) {
    console.log(`    ... and ${scans.length - 3} more`);
  }
}

// Now let's check for ANY profiles and scans to see what's actually in the DB
console.log(`\n🔍 SCANNING ALL DATA IN DATABASE:\n`);

const { data: allProfiles, count: profileCount } = await supabase
  .from("profiles")
  .select("id, display_name, email", { count: "exact" });

console.log(`Total profiles: ${profileCount}`);
if (allProfiles && allProfiles.length > 0) {
  console.log(`\nProfiles found:`);
  allProfiles.forEach((p) => {
    console.log(`  - ${p.display_name} (${p.email}) [${p.id.substring(0, 8)}...]`);
  });
}

const { data: allScans, count: scanCount } = await supabase
  .from("user_analyses")
  .select("user_id, product_name, COUNT(*) as cnt", { count: "exact" })
  .groupBy("user_id");

console.log(`\n\nTotal scan records: ${scanCount}`);
if (allScans && allScans.length > 0) {
  console.log(`\nUsers with scans:`);
  allScans.forEach((s) => {
    console.log(`  - ${s.user_id.substring(0, 8)}...: ${s.cnt || 1} scans`);
  });
}
