import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    🗑️  DELETING ALL STAGING TABLES                              ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

const stagingTables = [
  'user_analyses_staging',
  'user_events_staging',
  'user_roles_staging',
  'routines_staging',
  'routine_products_staging',
  'routine_optimizations_staging',
  'chat_conversations_staging',
  'chat_messages_staging',
  'feedback_staging',
  'beta_feedback_staging',
  'saved_dupes_staging',
  'usage_limits_staging',
  'profiles_staging',
  'rate_limit_log_staging',
  'ingredient_cache_staging',
  'academic_institutions_staging'
];

console.log(`📋 Found ${stagingTables.length} staging tables to delete:\n`);

for (const table of stagingTables) {
  console.log(`   • ${table}`);
}

console.log('\n⚠️  WARNING: This will DELETE all data in staging tables');
console.log('    Production tables will NOT be affected\n');

// Delete tables using SQL
const deleteSQL = stagingTables.map(t => `DROP TABLE IF EXISTS public."${t}" CASCADE;`).join('\n');

console.log('📝 SQL Commands to execute:');
console.log(deleteSQL);

console.log('\n✅ To execute, run these commands in Supabase SQL Editor');

