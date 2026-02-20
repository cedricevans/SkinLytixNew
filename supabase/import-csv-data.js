#!/usr/bin/env node

/**
 * CSV Data Import Script for SkinLytix
 * Imports all CSV exports into Supabase tables
 * 
 * Usage: node import-csv-data.js [--dry-run] [--table tablename]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSV parser that handles quoted fields with embedded newlines.
function parseCSV(content, delimiter = ',') {
  const records = [];
  let headers = null;
  let row = [];
  let field = '';
  let inQuotes = false;

  const pushRow = () => {
    // Skip empty trailing rows
    if (row.length === 0 && field === '') return;
    row.push(field);
    field = '';
    if (!headers) {
      headers = row;
    } else {
      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = row[j] ?? '';
      }
      records.push(record);
    }
    row = [];
  };

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes) {
      if (char === delimiter) {
        row.push(field);
        field = '';
        continue;
      }

      if (char === '\n') {
        pushRow();
        continue;
      }

      if (char === '\r') {
        // Handle CRLF
        if (nextChar === '\n') {
          i += 1;
        }
        pushRow();
        continue;
      }
    }

    field += char;
  }

  // Push any remaining data
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return records;
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const specificTable = args.find(arg => arg.startsWith('--table='))?.split('=')[1];

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envPath2 = path.join(__dirname, '..', '.env');
  const filesToCheck = [envPath, envPath2];
  
  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      console.log(`📝 Loading from: ${file}`);
      const envContent = fs.readFileSync(file, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          let value = valueParts.join('=').trim();
          // Remove quotes and trailing garbage
          value = value.replace(/^"|"$/g, '').replace(/%$/, '');
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
      break; // Use first file found
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL and (VITE_SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY) must be set');
  process.exit(1);
}

const isServiceRole = !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Optional UUID mapping (old profile UUID -> new auth UUID)
const uuidMappingPath = path.join(__dirname, 'uuid-mapping.json');
let uuidMapping = null;
if (fs.existsSync(uuidMappingPath)) {
  try {
    const raw = fs.readFileSync(uuidMappingPath, 'utf-8');
    const parsed = JSON.parse(raw);
    uuidMapping = parsed?.mapping || null;
    if (uuidMapping) {
      console.log(`🧭 Loaded UUID mapping (${Object.keys(uuidMapping).length} entries)`);
    }
  } catch (e) {
    console.warn('⚠️  Failed to load uuid-mapping.json, proceeding without mapping');
    uuidMapping = null;
  }
}

const mapUserIdIfNeeded = (value, mapUserId) => {
  if (!mapUserId || !uuidMapping || !value) return value;
  return uuidMapping[value] || value;
};

// Map CSV files to database tables with IMPORT ORDER
// ORDER MATTERS: Create auth users first, then profiles, then dependent tables
const importMap = [
  {
    filename: 'profiles-updated.json',
    table: 'profiles',
    type: 'json',
    description: 'User profiles with updated UUIDs (requires auth users to exist first)',
    note: 'CRITICAL: Using profiles-updated.json with correct Supabase UUIDs',
    upsertOn: 'id'
  },
  {
    filename: 'user_analyses-export-2026-02-18_12-45-38.csv',
    table: 'user_analyses',
    delimiter: ';',
    description: 'User analyses (product analysis data)',
    note: 'CRITICAL: Profiles must exist before importing (FK to profiles.id)',
    upsertOn: 'id',
    fkCheck: { table: 'profiles', idColumn: 'id', recordColumn: 'user_id' },
    mapUserId: true,
    batchSize: 5,
    columnMap: {
      'id': 'id',
      'user_id': 'user_id',
      'product_name': 'product_name',
      'ingredients_list': 'ingredients_list',
      'epiq_score': 'epiq_score',
      'recommendations_json': 'recommendations_json',
      'analyzed_at': 'analyzed_at',
      'brand': 'brand',
      'category': 'category',
      'product_price': 'product_price',
      'image_url': 'image_url'
    }
  },
  {
    filename: 'usage_limits-export-2026-02-18_13-51-15.csv',
    table: 'usage_limits',
    delimiter: ';',
    description: 'Usage limits (per-user monthly tracking)',
    upsertOn: 'id',
    fkCheck: { table: 'profiles', idColumn: 'id', recordColumn: 'user_id' },
    mapUserId: true
  },
  {
    filename: 'routine_optimizations-export-2026-02-18_13-50-41.csv',
    table: 'routine_optimizations',
    delimiter: ';',
    description: 'Routine optimizations (AI results)',
    upsertOn: 'id',
    note: 'Requires routines to exist (FK to routines.id)',
    fkCheck: { table: 'routines', idColumn: 'id', recordColumn: 'routine_id' }
  },
  {
    filename: 'market_dupe_cache-export-2026-02-18_13-02-51.csv',
    table: 'market_dupe_cache',
    delimiter: ';',
    description: 'Market dupe cache (per analysis)',
    upsertOn: 'id',
    note: 'Requires user_analyses for source_product_id',
    fkCheck: { table: 'user_analyses', idColumn: 'id', recordColumn: 'source_product_id' },
    mapUserId: true
  },
  {
    filename: 'user_events-export-2026-02-18_13-06-46.csv',
    table: 'user_events',
    delimiter: ';',
    description: 'User event tracking',
    upsertOn: 'id',
    mapUserId: true
  },
  {
    filename: 'ingredient_cache-export-2026-02-18_13-02-37.csv',
    table: 'ingredient_cache',
    delimiter: ';',
    description: 'Ingredient cache (PubChem + properties)',
    upsertOn: 'id'
  },
  {
    filename: 'ingredient_explanations_cache-export-2026-02-18_13-51-03.csv',
    table: 'ingredient_explanations_cache',
    delimiter: ';',
    description: 'Ingredient explanations cache',
    upsertOn: 'normalized_name'
  }
];

const fkCache = new Map();

async function getFkIdSet(fkCheck) {
  const cacheKey = `${fkCheck.table}.${fkCheck.idColumn}`;
  if (fkCache.has(cacheKey)) return fkCache.get(cacheKey);

  const { data, error } = await supabase.from(fkCheck.table).select(fkCheck.idColumn);
  if (error) {
    throw new Error(`FK lookup failed for ${fkCheck.table}: ${error.message}`);
  }

  const set = new Set((data || []).map((row) => row[fkCheck.idColumn]));
  fkCache.set(cacheKey, set);
  return set;
}

async function importData(importConfig) {
  const { filename, table, delimiter, description, type, columnMap, note, upsertOn, fkCheck, batchSize, mapUserId } = importConfig;
  const filepath = path.join(__dirname, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⏭️  Skipping ${table}: File not found (${filename})`);
    return { table, status: 'skipped', reason: 'file_not_found' };
  }

  try {
    let records;
    
    // Load data based on type
    if (type === 'json') {
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      records = JSON.parse(fileContent);
    } else {
      // CSV parsing
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      records = parseCSV(fileContent, delimiter || ',');
    }

    if (records.length === 0) {
      console.log(`⏭️  Skipping ${table}: No records found`);
      return { table, status: 'skipped', reason: 'no_records' };
    }

    console.log(`\n📊 Importing ${table}...`);
    console.log(`   Description: ${description}`);
    if (note) console.log(`   ⚠️  ${note}`);
    console.log(`   Records to import: ${records.length}`);
    console.log(`   File: ${filename}`);

    // Apply UUID mapping before FK checks if configured
    if (mapUserId && uuidMapping) {
      records = records.map((r) => ({
        ...r,
        user_id: mapUserIdIfNeeded(r.user_id, mapUserId)
      }));
    }

    // Validate FK references when configured
    if (fkCheck && !isDryRun) {
      const validIds = await getFkIdSet(fkCheck);
      const validRecords = records.filter(r => validIds.has(r[fkCheck.recordColumn]));
      const skipped = records.length - validRecords.length;

      if (skipped > 0) {
        console.log(`   ⚠️  Skipping ${skipped} records with invalid ${fkCheck.recordColumn}`);
        records = validRecords;
      }
    }

    if (isDryRun) {
      console.log(`   ✓ DRY RUN: Would import ${records.length} records`);
      console.log(`   Sample record keys: ${Object.keys(records[0]).join(', ')}`);
      return { table, status: 'dry_run', count: records.length };
    }

    // Import in batches to avoid hitting limits
    const batchSizeResolved = batchSize || 1000;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += batchSizeResolved) {
      const batch = records.slice(i, i + batchSizeResolved);
      const processedBatch = batch.map(record => {
        const processed = {};
        
        // If columnMap exists, only include mapped columns
        const columnsToProcess = columnMap 
          ? Object.keys(columnMap)
          : Object.keys(record);
        
        for (const csvColumn of columnsToProcess) {
          const value = record[csvColumn];
          const dbColumn = columnMap 
            ? columnMap[csvColumn]
            : csvColumn;

          const mappedValue = (dbColumn === 'user_id')
            ? mapUserIdIfNeeded(value, mapUserId)
            : value;
          
          // Convert empty strings to null
          if (mappedValue === '' || mappedValue === null) {
            processed[dbColumn] = null;
          }
          // Try to parse JSON objects that are already objects (from JSON load) or strings
          else if ((dbColumn === 'event_properties' || dbColumn === 'product_preferences' || 
                    dbColumn === 'optimization_data' || dbColumn === 'recommendations_json' ||
                    dbColumn.endsWith('_data') || dbColumn.endsWith('_json') || 
                    dbColumn === 'skin_concerns' || dbColumn === 'body_concerns' ||
                    dbColumn === 'dupes') &&
                   (typeof mappedValue === 'object' || (typeof mappedValue === 'string' && (mappedValue.startsWith('{') || mappedValue.startsWith('['))))) {
            try {
              processed[dbColumn] = typeof mappedValue === 'string' ? JSON.parse(mappedValue) : mappedValue;
            } catch (e) {
              processed[dbColumn] = mappedValue;
            }
          }
          // Convert boolean-like strings
          else if (mappedValue === 'true') {
            processed[dbColumn] = true;
          } else if (mappedValue === 'false') {
            processed[dbColumn] = false;
          }
          // Convert numeric strings  
          else if (!isNaN(mappedValue) && mappedValue !== '' && typeof mappedValue === 'string') {
            processed[dbColumn] = Number(mappedValue);
          } else {
            processed[dbColumn] = mappedValue;
          }
        }
        return processed;
      });

      // Use upsert when configured to avoid duplicate key errors when re-importing
      let result;
      if (upsertOn) {
        result = await supabase
          .from(table)
          .upsert(processedBatch, { onConflict: upsertOn });
      } else {
        result = await supabase
          .from(table)
          .insert(processedBatch, { count: 'exact' });
      }

      if (result.error) {
        console.error(`   ❌ Error inserting batch ${Math.floor(i / batchSizeResolved) + 1}:`, result.error.message);
        return { table, status: 'error', error: result.error.message, inserted: totalInserted };
      }

      totalInserted += batch.length;
      console.log(`   ✓ Inserted batch ${Math.floor(i / batchSizeResolved) + 1}/${Math.ceil(records.length / batchSizeResolved)} (${totalInserted}/${records.length})`);
    }

    console.log(`   ✅ Successfully imported ${totalInserted} records into ${table}`);
    return { table, status: 'success', count: totalInserted };

  } catch (error) {
    console.error(`   ❌ Error importing ${table}:`, error.message);
    return { table, status: 'error', error: error.message };
  }
}

async function main() {
  console.log('🚀 SkinLytix CSV Data Import');
  console.log('============================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Auth: ${isServiceRole ? '🔑 Service Role (bypass RLS)' : '👤 Anon Key (RLS applies)'}`);
  console.log(`Database: ${supabaseUrl.split('.')[0]}`);
  
  if (specificTable) {
    console.log(`Target: ${specificTable} only`);
  }

  const results = [];

  for (const config of importMap) {
    if (specificTable && config.table !== specificTable) {
      continue;
    }
    const result = await importData(config);
    results.push(result);
  }

  // Summary
  console.log('\n\n📋 IMPORT SUMMARY');
  console.log('=================');
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');
  const skipped = results.filter(r => r.status === 'skipped');
  const dryRuns = results.filter(r => r.status === 'dry_run');

  const totalRecords = [...successful, ...dryRuns]
    .reduce((sum, r) => sum + (r.count || 0), 0);

  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => console.log(`   - ${r.table}: ${r.count} records`));

  if (dryRuns.length > 0) {
    console.log(`🔄 Dry Run: ${dryRuns.length}`);
    dryRuns.forEach(r => console.log(`   - ${r.table}: ${r.count} records (would import)`));
  }

  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length}`);
    skipped.forEach(r => console.log(`   - ${r.table}: ${r.reason}`));
  }

  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    failed.forEach(r => console.log(`   - ${r.table}: ${r.error}`));
  }

  console.log(`\n📊 Total Records: ${totalRecords}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no data written)' : 'LIVE (data written to database)'}`);

  if (isDryRun) {
    console.log('\n💡 To import for real, run: node import-csv-data.js');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
