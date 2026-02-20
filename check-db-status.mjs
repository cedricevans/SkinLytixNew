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

console.log("🔍 DATABASE STATUS CHECK\n");

// Check tables
const tables = [
  "profiles",
  "user_analyses",
  "auth.users",
  "user_analyses_events",
];

for (const table of tables) {
  try {
    const { data, count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} records`);
    }
  } catch (err) {
    console.log(`❌ ${table}: ${err.message}`);
  }
}

// Get sample data from each table
console.log("\n📊 SAMPLE DATA:\n");

const { data: profileSample } = await supabase.from("profiles").select("*").limit(2);
console.log("Profiles sample:", profileSample);

const { data: analysesSample } = await supabase.from("user_analyses").select("*").limit(2);
console.log("User analyses sample:", analysesSample);
