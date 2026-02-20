import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load env from .env file
const envPath = "/Users/cedricevans/Downloads/Work_Station/Skinlytix/.env";
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || "https://mzprefkjpyavwbtkebqj.supabase.co";
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  console.error(`  URL: ${supabaseUrl ? "✓" : "✗"}`);
  console.error(`  Key: ${supabaseKey ? "✓" : "✗"}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The 12 users needing restoration
const targetUsers = [
  { uuid: "cb8048b3-a6bd-481b-8774-560dada2af59", name: "Test user", expected: 2 },
  { uuid: "7f226ed2-9623-4bca-a473-5ecf31389e2e", name: "Kevin", expected: 1 },
  { uuid: "c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be", name: "Christina Whiten", expected: 4 },
  { uuid: "d67f34ee-650b-4f5a-818c-86d699c5252a", name: "Nee", expected: 2 },
  { uuid: "625b088e-5977-4203-8d7b-27d3ca2ae27b", name: "Milly Figuereo", expected: 4 },
  { uuid: "a116901f-7d76-44d2-97e0-4d140a3d7333", name: "Tiffany", expected: 1 },
  { uuid: "c3a94f39-6841-4b8a-8521-02185a573b8a", name: "Chenae", expected: 3 },
  { uuid: "45d28611-5076-431e-9236-bbd5f806c414", name: "Ken87", expected: 1 },
  { uuid: "2a492020-7e11-4bf2-a028-590b07538859", name: "P Evans", expected: 3 },
  { uuid: "1e8c31de-0bc0-4dfc-8b86-22420741e849", name: "Test - Free", expected: 4 },
  { uuid: "cb4efe71-632f-4f0c-831e-96e9b12a708e", name: "Ced", expected: 2 },
  { uuid: "8963c7a4-a1bb-4f04-8145-84654e63bc84", name: "Csg11779", expected: 3 },
];

const csvPath = "/Users/cedricevans/Downloads/Work_Station/Skinlytix/supabase/user_analyses-export-2026-02-18_12-45-38.csv";

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, "utf-8");
const lines = csvContent.split("\n");
const header = lines[0].split(";");

// Find column indices
const uuidIdx = header.findIndex((h) => h.trim().toLowerCase() === "user_id");
const productIdx = header.findIndex((h) => h.trim().toLowerCase() === "product_name");

console.log(`📥 Reading CSV with ${lines.length - 1} data rows`);
console.log(`📋 UUID column: ${uuidIdx}, Product column: ${productIdx}`);

// Parse records for target users only
const recordsByUser = {};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;

  const parts = lines[i].split(";");
  const uuid = parts[uuidIdx]?.trim().toLowerCase() || "";
  const product = parts[productIdx]?.trim() || "Unknown Product";

  if (targetUsers.some((u) => u.uuid.toLowerCase() === uuid)) {
    if (!recordsByUser[uuid]) {
      recordsByUser[uuid] = [];
    }
    recordsByUser[uuid].push(product);
  }
}

// Display what we found
console.log("\n📊 Records found for 12 users:");
let totalFound = 0;
for (const user of targetUsers) {
  const count = (recordsByUser[user.uuid] || []).length;
  totalFound += count;
  const match = count === user.expected ? "✓" : "✗";
  console.log(`  ${user.name} (${count}/${user.expected}) ${match}`);
  if (count > 0) {
    (recordsByUser[user.uuid] || []).slice(0, 2).forEach((p) => {
      console.log(`    • ${p.substring(0, 50)}`);
    });
    if (count > 2) console.log(`    • ... and ${count - 2} more`);
  }
}

console.log(`\n📈 Total records found: ${totalFound} of ~28 expected`);

// Now create scan records with placeholder timestamps
// Use a base date and increment slightly for each scan
const baseDate = new Date("2025-11-20T12:00:00.000Z");
const baseTime = baseDate.getTime();

const scansToInsert = [];
let scanId = 1;

for (const user of targetUsers) {
  const products = recordsByUser[user.uuid] || [];

  for (let i = 0; i < products.length; i++) {
    // Create a slightly different timestamp for each scan
    const offsetMs = i * 3600000; // 1 hour between each scan
    const timestamp = new Date(baseTime + offsetMs).toISOString();

    scansToInsert.push({
      id: scanId++,
      user_id: user.uuid,
      product_name: products[i],
      analyzed_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }
}

console.log(`\n📝 Prepared ${scansToInsert.length} scans for insertion`);

// Insert in batches
const batchSize = 5;
let successCount = 0;
let failCount = 0;

console.log("\n⏳ Inserting scans...");

for (let i = 0; i < scansToInsert.length; i += batchSize) {
  const batch = scansToInsert.slice(i, i + batchSize);

  try {
    const { data, error } = await supabase
      .from("user_analyses")
      .insert(batch)
      .select();

    if (error) {
      console.log(`❌ Batch ${i / batchSize + 1} failed:`, error.message);
      failCount += batch.length;
    } else {
      console.log(`✅ Batch ${i / batchSize + 1}: ${batch.length} scans inserted`);
      successCount += batch.length;
    }
  } catch (err) {
    console.log(`❌ Batch ${i / batchSize + 1} error:`, err.message);
    failCount += batch.length;
  }
}

console.log(`\n📊 Insertion complete:`);
console.log(`  ✅ ${successCount} scans inserted successfully`);
console.log(`  ❌ ${failCount} scans failed to insert`);

// Verify counts
console.log("\n🔍 Verifying scan counts...");
for (const user of targetUsers) {
  const { data, error } = await supabase
    .from("user_analyses")
    .select("id")
    .eq("user_id", user.uuid);

  if (!error && data) {
    const count = data.length;
    const match = count === user.expected ? "✓" : "✗";
    console.log(`  ${user.name}: ${count}/${user.expected} ${match}`);
  }
}
