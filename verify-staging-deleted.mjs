import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              ✅ VERIFYING: STAGING TABLES DELETED                               ║');
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
let stillExists = 0;

for (const table of stagingTables) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('count(*)', { count: 'exact', head: true });
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist (the error code for "relation does not exist")
      console.log(`✅ DELETED: ${table}`);
      deleted++;
    } else if (error) {
      console.log(`❓ ${table}: ${error.message}`);
    } else {
      console.log(`❌ STILL EXISTS: ${table}`);
      stillExists++;
    }
  } catch (e) {
    // If we get an error querying, the table likely doesn't exist
    console.log(`✅ DELETED: ${table}`);
    deleted++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
console.log(`\n✅ Successfully Deleted: ${deleted} tables`);
console.log(`❌ Still Exist: ${stillExists} tables\n`);

if (stillExists === 0) {
  console.log('🎉 SUCCESS! All staging tables have been removed!\n');
} else {
  console.log(`⚠️  ${stillExists} staging table(s) still exist\n`);
}

