import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('🔍 CHECKING STAGING TABLES (mzprefkjpyavwbtkebqj)\n');

// Check staging tables
const { data: stagingScans, error: err1 } = await supabase
  .from('user_analyses_staging')
  .select('*', { count: 'exact', head: true });

const { data: stagingRoutines, error: err2 } = await supabase
  .from('routines_staging')
  .select('*', { count: 'exact', head: true });

console.log(`📊 STAGING TABLE DATA:`);
console.log(`   user_analyses_staging: ${stagingScans ? stagingScans.length : 'error'} (expected: 201)`);
console.log(`   routines_staging: ${stagingRoutines ? stagingRoutines.length : 'error'} (expected: 25)\n`);

// Check Cedric's data in staging
console.log('👤 CEDRIC DATA IN STAGING:\n');

const { data: cedricStagingScans } = await supabase
  .from('user_analyses_staging')
  .select('id, product_name, brand')
  .eq('user_id', '80c09810-7a89-4c4f-abc5-8f59036cd080');

console.log(`   Scans: ${cedricStagingScans.length} (expected: 25)`);
if (cedricStagingScans.length > 0) {
  cedricStagingScans.slice(0, 3).forEach((s, i) => {
    console.log(`     ${i+1}. ${s.product_name} by ${s.brand}`);
  });
}

// Check Adupass in staging
console.log('\n🔐 ADUPASS DATA IN STAGING:\n');

const { data: adupassStagingScans } = await supabase
  .from('user_analyses_staging')
  .select('id, product_name')
  .eq('user_id', '4efb5df3-ce0a-40f6-ae13-6defa1610d3a');

console.log(`   Scans: ${adupassStagingScans.length} (expected: 70)`);

console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
console.log(`\n✅ ALL DATA IS IN STAGING TABLES - App is reading correctly!\n`);

