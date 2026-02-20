import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL =
  process.env.SUPABASE_NEW_URL || 
  process.env.SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  "";
const SERVICE_ROLE_KEY = 
  process.env.SUPABASE_NEW_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  "";
const TEMP_PASSWORD = process.env.SUPABASE_TEMP_PASSWORD || "TempPassword123!";
const DRY_RUN = process.env.SUPABASE_DRY_RUN === "true";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_NEW_URL or SUPABASE_NEW_SERVICE_ROLE_KEY. Aborting."
  );
  process.exit(1);
}

console.log("Loaded configuration:");
console.log("  SUPABASE_URL:", SUPABASE_URL);
console.log("  SERVICE_ROLE_KEY (first 20 chars):", SERVICE_ROLE_KEY?.substring(0, 20));
console.log("  DRY_RUN:", DRY_RUN);

const usersPath = path.join(__dirname, "user.json");
const raw = await fs.readFile(usersPath, "utf8");
const users = JSON.parse(raw);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let created = 0;
let updated = 0;
let skipped = 0;
let failed = 0;

for (const user of users) {
  if (!user?.id || !user?.email) {
    console.warn("Skipping invalid user entry:", user);
    skipped += 1;
    continue;
  }

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would upsert ${user.email} (${user.id})`);
    continue;
  }

  const { data: existing, error: getErr } =
    await supabase.auth.admin.getUserById(user.id);

  if (getErr && !getErr.message?.toLowerCase().includes("not found")) {
    console.error(`Failed lookup ${user.email}: ${getErr.message}`);
    failed += 1;
    continue;
  }

  if (!existing?.user) {
    const { error } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      email_confirm: true,
      user_metadata: { display_name: user.display_name || "" },
      password: TEMP_PASSWORD,
    });

    if (error) {
      console.error(`Create failed ${user.email}: ${error.message}`);
      failed += 1;
    } else {
      console.log(`Created ${user.email}`);
      created += 1;
    }
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      email: user.email,
      email_confirm: true,
      user_metadata: { display_name: user.display_name || "" },
      password: TEMP_PASSWORD,
    });

    if (error) {
      console.error(`Update failed ${user.email}: ${error.message}`);
      failed += 1;
    } else {
      console.log(`Updated ${user.email}`);
      updated += 1;
    }
  }
}

console.log("Done.");
console.log(
  JSON.stringify(
    {
      created,
      updated,
      skipped,
      failed,
      total: users.length,
    },
    null,
    2
  )
);
