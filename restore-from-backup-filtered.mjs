import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                   🔄 RESTORING DATA FROM BACKUP CSVs (FILTERED)                 ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

// Helper to parse CSV with semicolon delimiter
function parseCSV(csvText, columnsToKeep) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  
  // Use semicolon as delimiter
  const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';').map(v => v.trim().replace(/^"|"$/g, ''));
    const record = {};
    headers.forEach((header, idx) => {
      if (columnsToKeep.includes(header)) {
        record[header] = values[idx] === '' ? null : values[idx];
      }
    });
    records.push(record);
  }
  
  return records;
}

// Restore user_analyses
console.log('📥 Step 1: Restoring user_analyses (201 scans)');
console.log('─────────────────────────────────────────────────────────────────────────────────────');

const analysesPath = path.join(__dirname, 'supabase/user_analyses-export-2026-02-18_12-45-38.csv');
const analysesCSV = fs.readFileSync(analysesPath, 'utf-8');
const analysesKeep = ['id', 'user_id', 'product_name', 'ingredients_list', 'epiq_score', 'recommendations_json', 'analyzed_at', 'brand', 'category', 'product_price', 'image_url'];
const analyses = parseCSV(analysesCSV, analysesKeep);

console.log(`📦 Parsed ${analyses.length} scan records from CSV`);

// Insert in batches
const batchSize = 50;
let inserted = 0;
let failed = 0;

for (let i = 0; i < analyses.length; i += batchSize) {
  const batch = analyses.slice(i, i + batchSize);
  const { error } = await supabase
    .from('user_analyses')
    .insert(batch);
  
  if (error) {
    console.log(`❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
    failed += batch.length;
  } else {
    inserted += batch.length;
    const progress = Math.min(inserted, analyses.length);
    process.stdout.write(`\r✅ Inserted: ${progress}/${analyses.length}`);
  }
}

console.log(`\n\nResult: ${inserted}/${analyses.length} scans restored`);
if (failed > 0) console.log(`⚠️  ${failed} records failed to insert\n`);
else console.log('✅ All scans restored successfully!\n');

// Restore user_events
console.log('📥 Step 2: Restoring user_events (~3,964 events)');
console.log('─────────────────────────────────────────────────────────────────────────────────────');

const eventsPath = path.join(__dirname, 'supabase/user_events-export-2026-02-18_13-06-46.csv');
const eventsCSV = fs.readFileSync(eventsPath, 'utf-8');
const eventsKeep = ['id', 'user_id', 'event_name', 'event_category', 'event_properties', 'page_url', 'referrer', 'user_agent', 'created_at'];
const events = parseCSV(eventsCSV, eventsKeep);

console.log(`📦 Parsed ${events.length} event records from CSV`);

inserted = 0;
failed = 0;

for (let i = 0; i < events.length; i += batchSize) {
  const batch = events.slice(i, i + batchSize);
  const { error } = await supabase
    .from('user_events')
    .insert(batch);
  
  if (error) {
    console.log(`❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
    failed += batch.length;
  } else {
    inserted += batch.length;
    const progress = Math.min(inserted, events.length);
    process.stdout.write(`\r✅ Inserted: ${progress}/${events.length}`);
  }
}

console.log(`\n\nResult: ${inserted}/${events.length} events restored`);
if (failed > 0) console.log(`⚠️  ${failed} records failed to insert\n`);
else console.log('✅ All events restored successfully!\n');

console.log('═══════════════════════════════════════════════════════════════════════════════════');
console.log('\n✨ Backup restoration complete!\n');

