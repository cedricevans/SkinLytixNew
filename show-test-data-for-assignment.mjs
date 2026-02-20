import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              DETAILED ORPHANED TEST DATA REPORT FOR ASSIGNMENT                  ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

const orphanedTestEmails = [
  'beta-test-1757619142857@example.com',
  'beta-test-1758659296143@example.com',
  'test.user@skinlytix.dev',
  'test_nov24@test.com',
  'test_d67f@test.com',
  'test_625b@test.com',
  'test_1216@test.com',
  'test_45d2@test.com',
  'test_80c0@test.com',
  'test_8902@test.com',
  'test_2a49@test.com',
  'test_6413@test.com',
  'test_b9eb@test.com',
  'test_cb4e@test.com',
  'test_a116@test.com',
  'test_c3a9@test.com',
  'test_7f22@test.com',
  'test_8963@test.com'
];

(async () => {
  try {
    // Get all profiles
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email');

    // Get all analyses (just IDs and user_id for speed)
    const { data: allAnalyses, error: analysisError } = await supabase
      .from('user_analyses')
      .select('user_id, product_name, brand');

    if (analysisError || !allAnalyses) {
      console.error('Error fetching analyses:', analysisError?.message || 'Unknown error');
      process.exit(1);
    }

    const testProfiles = allProfiles.filter(p => orphanedTestEmails.includes(p.email));
    const realProfiles = allProfiles.filter(p => !orphanedTestEmails.includes(p.email));

    // Build analysis map
    const analysisMap = new Map();
    allAnalyses.forEach(a => {
      if (!analysisMap.has(a.user_id)) {
        analysisMap.set(a.user_id, []);
      }
      analysisMap.get(a.user_id).push(a);
    });

    console.log('🗑️  TEST ACCOUNTS WITH MIGRATABLE DATA:\n');
    
    const migrateableData = [];

    for (const testProfile of testProfiles) {
      const testData = analysisMap.get(testProfile.id) || [];
      
      if (testData.length === 0) {
        continue;
      }

      const brands = [...new Set(testData.map(d => d.brand).filter(b => b))];
      const products = testData.map(d => ({
        name: d.product_name,
        brand: d.brand
      }));

      migrateableData.push({
        testEmail: testProfile.email,
        testId: testProfile.id,
        scanCount: testData.length,
        brands: brands,
        products: products
      });

      console.log(`📦 ${testProfile.email}`);
      console.log(`   Scans: ${testData.length}`);
      console.log(`   Brands: ${brands.join(', ')}`);
      console.log(`\n   Products scanned:`);
      products.forEach((p, i) => {
        console.log(`      ${i+1}. ${p.name || '(no name)'} ${p.brand ? `(${p.brand})` : ''}`);
      });
      console.log();
    }

    // Show real users with 0 scans
    console.log('─'.repeat(90));
    console.log('\n👤 REAL USERS WITH 0 SCANS (candidates for receiving test data):\n');

    const usersWithZeroScans = realProfiles.filter(u => {
      const data = analysisMap.get(u.id) || [];
      return data.length === 0;
    });

    usersWithZeroScans.forEach(u => {
      console.log(`   • ${u.email}`);
    });

    console.log(`\n   Total: ${usersWithZeroScans.length} users with 0 scans\n`);

    // Summary
    console.log('─'.repeat(90));
    console.log('\n📊 MIGRATION SUMMARY:\n');
    console.log(`Test accounts with data: ${migrateableData.length}`);
    console.log(`Total scans to migrate: ${migrateableData.reduce((sum, m) => sum + m.scanCount, 0)}`);
    console.log(`Real users available: ${usersWithZeroScans.length}\n`);

    console.log('─'.repeat(90));
    console.log('\n✏️  NEXT STEPS:\n');
    console.log('Choose how to assign this data:');
    console.log('1. Manually map test accounts to real users');
    console.log('2. Distribute data evenly among 0-scan users');
    console.log('3. Delete all test accounts (discard the data)\n');

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
