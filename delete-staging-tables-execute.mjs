import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              🗑️  EXECUTING: DELETE ALL STAGING TABLES                           ║');
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

let deleted = 0;
let failed = 0;

for (const table of stagingTables) {
  const sql = `DROP TABLE IF EXISTS public."${table}" CASCADE;`;
  
  const { error } = await supabase.rpc('exec', { sql });
  
  // Try alternative approach - use direct SQL execution
  try {
    // Supabase doesn't have direct exec, so we'll try via admin API
    const response = await fetch(
      'https://mzprefkjpyavwbtkebqj.supabase.co/rest/v1/rpc/exec',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      }
    );
    
    if (response.ok) {
      console.log(`✅ Deleted: ${table}`);
      deleted++;
    } else {
      console.log(`⚠️  ${table}: ${response.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${table}: ${e.message}`);
    failed++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
console.log(`\n✅ Deleted: ${deleted} tables`);
console.log(`❌ Failed: ${failed} tables\n`);

console.log('📝 NOTE: You may need to delete tables manually in Supabase SQL Editor');
console.log('    Go to: https://supabase.com/dashboard → SQL Editor');
console.log('    Run this SQL:\n');

const sqlCommands = stagingTables.map(t => `DROP TABLE IF EXISTS public."${t}" CASCADE;`).join('\n');
console.log(sqlCommands);

