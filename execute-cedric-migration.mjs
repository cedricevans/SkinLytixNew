import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

const OLD_UUID = '85e9dd5c-b774-45a1-9d16-e0ebe82053e4'; // test_80c0@test.com
const NEW_UUID = '80c09810-7a89-4c4f-abc5-8f59036cd080'; // cedric.evans@gmail.com

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    MIGRATING CEDRIC\'S 25 SCANS TO CORRECT UUID                  ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

console.log(`From: ${OLD_UUID} (test_80c0@test.com)`);
console.log(`To:   ${NEW_UUID} (cedric.evans@gmail.com)\n`);

(async () => {
  try {
    // 1. Count records before migration
    console.log('📊 BEFORE MIGRATION:');
    const { data: oldCountData } = await supabase
      .from('user_analyses')
      .select('id', { count: 'exact' })
      .eq('user_id', OLD_UUID);
    const oldCount = oldCountData?.length || 0;

    const { data: cedricCountData } = await supabase
      .from('user_analyses')
      .select('id', { count: 'exact' })
      .eq('user_id', NEW_UUID);
    const cedricCountBefore = cedricCountData?.length || 0;

    console.log(`  test_80c0 account: ${oldCount} scans`);
    console.log(`  cedric.evans account: ${cedricCountBefore} scans\n`);

    if (oldCount === 0) {
      console.error('❌ ERROR: No records found in test_80c0 account. Migration cancelled.');
      process.exit(1);
    }

    // 2. Migrate user_analyses
    console.log('🔄 Migrating user_analyses...');
    const { error: analysesError } = await supabase
      .from('user_analyses')
      .update({ user_id: NEW_UUID })
      .eq('user_id', OLD_UUID);

    if (analysesError) {
      console.error('❌ Error updating user_analyses:', analysesError.message);
      process.exit(1);
    }
    console.log('   ✅ user_analyses updated');

    // 3. Migrate routines
    console.log('🔄 Migrating routines...');
    const { error: routinesError } = await supabase
      .from('routines')
      .update({ user_id: NEW_UUID })
      .eq('user_id', OLD_UUID);

    if (routinesError) {
      console.error('❌ Error updating routines:', routinesError.message);
      process.exit(1);
    }
    console.log('   ✅ routines updated');

    // 4. Migrate saved_dupes
    console.log('🔄 Migrating saved_dupes...');
    const { error: dupesError } = await supabase
      .from('saved_dupes')
      .update({ user_id: NEW_UUID })
      .eq('user_id', OLD_UUID);

    if (dupesError) {
      console.error('❌ Error updating saved_dupes:', dupesError.message);
      process.exit(1);
    }
    console.log('   ✅ saved_dupes updated');

    // 5. Get routine IDs to migrate routine_products
    console.log('🔄 Migrating routine_products...');
    const { data: routineIds } = await supabase
      .from('routines')
      .select('id')
      .eq('user_id', NEW_UUID);

    if (routineIds && routineIds.length > 0) {
      for (const routine of routineIds) {
        const { error: rpError } = await supabase
          .from('routine_products')
          .update({ user_id: NEW_UUID })
          .eq('routine_id', routine.id);

        if (rpError) {
          console.error(`⚠️  Warning updating routine_products for routine ${routine.id}:`, rpError.message);
        }
      }
    }
    console.log('   ✅ routine_products updated');

    // 6. Verify migration
    console.log('\n📊 AFTER MIGRATION:');
    const { data: newOldCount } = await supabase
      .from('user_analyses')
      .select('id', { count: 'exact' })
      .eq('user_id', OLD_UUID);
    
    const { data: newCedricCount } = await supabase
      .from('user_analyses')
      .select('id', { count: 'exact' })
      .eq('user_id', NEW_UUID);

    const finalOldCount = newOldCount?.length || 0;
    const finalCedricCount = newCedricCount?.length || 0;

    console.log(`  test_80c0 account: ${finalOldCount} scans`);
    console.log(`  cedric.evans account: ${finalCedricCount} scans`);

    // Success check
    if (finalOldCount === 0 && finalCedricCount === oldCount + cedricCountBefore) {
      console.log('\n✅ MIGRATION SUCCESSFUL!');
      console.log(`   ${oldCount} scans moved to cedric.evans@gmail.com`);
      console.log('\n📌 Next steps: Login to the app as cedric.evans@gmail.com to verify');
    } else {
      console.log('\n⚠️  MIGRATION VERIFICATION FAILED');
      console.log(`   Expected cedric to have: ${oldCount + cedricCountBefore} scans`);
      console.log(`   Actually has: ${finalCedricCount} scans`);
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
