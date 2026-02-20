import { createClient } from "@supabase/supabase-js";
import fs from "fs";

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

// Get all columns for user_analyses table
const { data, error } = await supabase.from("user_analyses").select("*").limit(1);

if (error) {
  console.error("Error:", error);
} else if (data && data.length > 0) {
  console.log("Columns in user_analyses table:");
  console.log(Object.keys(data[0]).join(", "));
  console.log("\nSample record:");
  console.log(JSON.stringify(data[0], null, 2));
}
