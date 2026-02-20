import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const envPath = "/Users/cedricevans/Downloads/Work_Station/Skinlytix/.env.local";
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
  envVars.VITE_SUPABASE_SERVICE_ROLE_KEY // Using service role key!
);

console.log("🔍 DATABASE STATUS (With Service Role Key)\n");

// Get profile count
const { count: profileCount } = await supabase
  .from("profiles")
  .select("*", { count: "exact", head: true });

// Get analyses count
const { count: analysesCount } = await supabase
  .from("user_analyses")
  .select("*", { count: "exact", head: true });

console.log(`✅ profiles: ${profileCount} records`);
console.log(`✅ user_analyses: ${analysesCount} records`);

if (profileCount > 0) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .order("created_at");

  console.log(`\n📋 All Profiles (${profiles?.length || 0}):`);
  profiles?.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.display_name} (${p.email})`);
  });
}

if (analysesCount > 0) {
  const { data: analyses } = await supabase
    .from("user_analyses")
    .select("user_id, COUNT(*) as scan_count")
    .limit(100);

  console.log(`\n📊 Analyses by User:`);
  // Group by user_id manually
  const scansByUser = {};
  analyses?.forEach((a) => {
    scansByUser[a.user_id] = (scansByUser[a.user_id] || 0) + 1;
  });

  Object.entries(scansByUser).forEach(([uuid, count], i) => {
    console.log(`  ${i + 1}. ${uuid.substring(0, 8)}...: ${count} scans`);
  });
}
