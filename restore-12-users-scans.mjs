import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

// The 12 users needing scans restored
const targetUUIDs = new Set([
  'cb8048b3-a6bd-481b-8774-560dada2af59', // Test user
  '7f226ed2-9623-4bca-a473-5ecf31389e2e', // Kevin
  'c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be', // Christina Whiten
  'd67f34ee-650b-4f5a-818c-86d699c5252a', // Nee
  '625b088e-5977-4203-8d7b-27d3ca2ae27b', // Milly Figuereo
  'a116901f-7d76-44d2-97e0-4d140a3d7333', // Tiffany
  'c3a94f39-6841-4b8a-8521-02185a573b8a', // Chenae
  '45d28611-5076-431e-9236-bbd5f806c414', // Ken87
  '2a492020-7e11-4bf2-a028-590b07538859', // P Evans
  '1e8c31de-0bc0-4dfc-8b86-22420741e849', // Test - Free
  'cb4efe71-632f-4f0c-831e-96e9b12a708e', // Ced
  '8963c7a4-a1bb-4f04-8145-84654e63bc84', // Csg11779
]);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║          🔄 RESTORING SCANS FOR 12 USERS FROM BACKUP CSV                       ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

// Read the backup CSV file
const csvPath = path.join(__dirname, 'supabase/user_analyses-export-2026-02-18_12-45-38.csv');
console.log(`📥 Reading backup CSV: ${csvPath}\n`);

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');

// Parse CSV with semicolon delimiter
const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
console.log(`Found ${lines.length - 1} total scans in backup\n`);

// Extract scans for the 12 users
const scansToRestore = [];
const scansPerUser = {};

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(';').map(v => v.trim().replace(/^"|"$/g, ''));
  const record = {};
  headers.forEach((header, idx) => {
    record[header] = values[idx] === '' ? null : values[idx];
  });
  
  if (targetUUIDs.has(record.user_id)) {
    scansToRestore.push(record);
    scansPerUser[record.user_id] = (scansPerUser[record.user_id] || 0) + 1;
  }
}

console.log(`📊 Found ${scansToRestore.length} scans for the 12 users:\n`);
Object.entries(scansPerUser).forEach(([uuid, count]) => {
  console.log(`  ${uuid}: ${count} scans`);
});
console.log();

// Restore the scans
console.log('⏳ Restoring scans to database...\n');

const columnsToKeep = ['id', 'user_id', 'product_name', 'ingredients_list', 'epiq_score', 'recommendations_json', 'analyzed_at', 'brand', 'category', 'product_price', 'image_url'];
const filteredScans = scansToRestore.map(scan => {
  const filtered = {};
  columnsToKeep.forEach(col => {
    if (scan[col] !== undefined) {
      filtered[col] = scan[col];
    }
  });
  return filtered;
});

const batchSize = 25;
let inserted = 0;
let failed = 0;

for (let i = 0; i < filteredScans.length; i += batchSize) {
  const batch = filteredScans.slice(i, i + batchSize);
  const { error } = await supabase
    .from('user_analyses')
    .insert(batch);
  
  if (error) {
    console.log(`❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
    failed += batch.length;
  } else {
    inserted += batch.length;
    const progress = Math.min(inserted, filteredScans.length);
    console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} scans inserted (${progress}/${filteredScans.length})`);
  }
}

console.log(`\nResult: ${inserted}/${filteredScans.length} scans restored`);
if (failed > 0) console.log(`⚠️  ${failed} records failed to insert\n`);
else console.log('✅ All scans restored successfully!\n');

// Verify the restoration
console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
console.log('✅ VERIFICATION:\n');

for (const uuid of targetUUIDs) {
  const { count } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uuid);
  
  const expected = scansPerUser[uuid] || 0;
  const status = count === expected ? '✅' : '⚠️';
  console.log(`${status} ${uuid}: ${count}/${expected} scans`);
}

