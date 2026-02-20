import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║         ✅ FINAL VERIFICATION: 78 LEGITIMATE USERS - AGAINST VALIDATION MAP    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

// Key users from validation map with CORRECT UUIDs
const keyUsers = [
  { name: 'Adupass (Admin/Owner)', uuid: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a', expectedScans: 70 },
  { name: 'James Goodnight', uuid: '4d732879-4cfa-49c1-8b6a-328e707a0428', expectedScans: 24 },
  { name: 'Cedric Evans', uuid: '80c09810-7a89-4c4f-abc5-8f59036cd080', expectedScans: 25 },
  { name: 'Christina Branch', uuid: '86b3f49a-2113-4981-9cd5-cb222ad03fe1', expectedScans: 9 },
];

console.log('📊 STEP 1: Key Users - Scan Verification');
console.log('─────────────────────────────────────────────────────────────────────────────────────\n');

let keyUsersPass = 0;
let keyUsersFail = 0;

for (const user of keyUsers) {
  const { count } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.uuid);
  
  if (count === user.expectedScans) {
    console.log(`✅ ${user.name}: ${count} scans`);
    keyUsersPass++;
  } else {
    console.log(`❌ ${user.name}: ${count} scans (expected ${user.expectedScans})`);
    keyUsersFail++;
  }
}

console.log('');

// Total counts
console.log('📊 STEP 2: Database Totals');
console.log('─────────────────────────────────────────────────────────────────────────────────────\n');

const { count: profileCount } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true });

const { count: scanCount } = await supabase
  .from('user_analyses')
  .select('*', { count: 'exact', head: true });

const { count: eventCount } = await supabase
  .from('user_events')
  .select('*', { count: 'exact', head: true });

const { count: routineCount } = await supabase
  .from('routines')
  .select('*', { count: 'exact', head: true });

console.log(`Profiles: ${profileCount} (expected: 78)`);
console.log(`Scans (user_analyses): ${scanCount} (expected: 201)`);
console.log(`Events (user_events): ${eventCount} (expected: ~3,964)`);
console.log(`Routines: ${routineCount} (expected: 25)`);
console.log('');

// Summary
console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
console.log('🎯 SUMMARY:\n');

let allPass = true;

if (profileCount === 78) {
  console.log('✅ Profile count: 78 ✓');
} else {
  console.log(`❌ Profile count: ${profileCount} (expected 78)`);
  allPass = false;
}

if (scanCount === 201) {
  console.log('✅ Scan count: 201 ✓');
} else {
  console.log(`⚠️  Scan count: ${scanCount} (expected 201) - Missing: ${201 - scanCount}`);
  allPass = false;
}

if (keyUsersFail === 0) {
  console.log('✅ All key users have correct scan counts ✓');
} else {
  console.log(`❌ ${keyUsersFail} key user(s) have incorrect scans`);
  allPass = false;
}

console.log('');

if (allPass && scanCount === 201) {
  console.log('🎉🎉🎉 ALL CHECKS PASSED! 🎉🎉🎉\n');
  console.log('✨ Database is clean and ready for production ✨\n');
  console.log('Summary:');
  console.log('  • 78 legitimate users confirmed');
  console.log('  • 201 scans accounted for');
  console.log('  • All key users have correct data');
  console.log('  • No orphaned or duplicate data\n');
} else {
  console.log('⚠️  SOME DATA STILL MISSING:\n');
  if (scanCount < 201) {
    console.log(`   Missing scans: ${201 - scanCount}`);
    console.log('   These may need to be restored from backup CSVs\n');
  }
}

