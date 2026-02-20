import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
dotenv.config({ path: path.join(__dirname, ".env.local") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

console.log("Testing Supabase connection...\n");

console.log("URL:", SUPABASE_URL);
console.log("Service Role Key (first 50 chars):", SERVICE_ROLE_KEY?.substring(0, 50));
console.log("Anon Key (first 50 chars):", ANON_KEY?.substring(0, 50));

// Test with service role key
console.log("\n--- Testing with Service Role Key ---");
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("❌ Error with service role key:", error.message);
  } else {
    console.log("✅ Service role key works!");
    console.log("  Total users:", data?.users?.length);
  }
} catch (err) {
  console.error("❌ Exception:", err.message);
}

// Test with anon key
console.log("\n--- Testing with Anon Key ---");
const supabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  const { data, error } = await supabaseClient.auth.admin.listUsers();
  if (error) {
    console.error("❌ Error with anon key:", error.message);
  } else {
    console.log("✅ Anon key works!");
    console.log("  Total users:", data?.users?.length);
  }
} catch (err) {
  console.error("❌ Exception:", err.message);
}
