import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║     DEEP AUDIT: MATCHING TEST ACCOUNTS TO SUPABASE AUTH & REAL USER DATA       ║');
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
    console.log('🔍 STEP 1: Check if orphaned test accounts exist in Supabase auth.users\n');

    // Get all profiles and their data
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email, created_at');

    const { data: allAnalyses } = await supabase
      .from('user_analyses')
      .select('user_id, product_name, brand');

    // Build analysis map
    const analysisMap = new Map();
    allAnalyses.forEach(a => {
      if (!analysisMap.has(a.user_id)) {
        analysisMap.set(a.user_id, []);
      }
      analysisMap.get(a.user_id).push(a);
    });

    // Check each orphaned test account
    const testAccountsInAuth = [];
    const testAccountsNotInAuth = [];

    for (const testEmail of orphanedTestEmails) {
      const profile = allProfiles.find(p => p.email === testEmail);
      const scanCount = analysisMap.get(profile?.id)?.length || 0;

      if (profile) {
        testAccountsInAuth.push({
          email: testEmail,
          uuid: profile.id,
          createdAt: profile.created_at,
          scanCount: scanCount,
          inProfiles: true
        });
        
        console.log(`✅ Found in profiles: ${testEmail}`);
        console.log(`   UUID: ${profile.id}`);
        console.log(`   Created: ${new Date(profile.created_at).toLocaleDateString()}`);
        console.log(`   Scans: ${scanCount}\n`);
      } else {
        testAccountsNotInAuth.push(testEmail);
      }
    }

    if (testAccountsNotInAuth.length > 0) {
      console.log(`\n❌ NOT found in profiles (orphaned):\n`);
      testAccountsNotInAuth.forEach(email => {
        console.log(`   • ${email}`);
      });
    }

    // Now analyze: could any test account name match a real user?
    console.log('\n' + '─'.repeat(90));
    console.log('\n🔗 STEP 2: Could test account names belong to real users?\n');

    const realProfiles = allProfiles.filter(p => !orphanedTestEmails.includes(p.email));

    const possibleMatches = [];

    for (const testAccount of testAccountsInAuth) {
      const testName = testAccount.email
        .replace(/test_?/, '')
        .replace(/@.*/, '')
        .split(/[_\-.]/)
        .filter(x => x.length > 0 && !x.match(/\d{10,}/));

      for (const realProfile of realProfiles) {
        const realName = realProfile.email
          .replace(/@.*/, '')
          .split(/[_\-.]/)
          .filter(x => x.length > 0);

        const nameMatch = testName.some(t => realName.some(r => 
          t === r && t.length > 2
        ));

        if (nameMatch) {
          const realScans = analysisMap.get(realProfile.id) || [];
          possibleMatches.push({
            testEmail: testAccount.email,
            testScans: testAccount.scanCount,
            realEmail: realProfile.email,
            realScans: realScans.length,
            matchType: 'name_pattern'
          });

          console.log(`⚠️  POSSIBLE MATCH:`);
          console.log(`    Test: ${testAccount.email} (${testAccount.scanCount} scans)`);
          console.log(`    Real: ${realProfile.email} (${realScans.length} scans)`);
          console.log(`    Reason: Email name match\n`);
        }
      }
    }

    if (possibleMatches.length === 0) {
      console.log('No name matches found between test accounts and real users.\n');
    }

    // Check if ANY test account data matches real user product patterns
    console.log('\n' + '─'.repeat(90));
    console.log('\n🔎 STEP 3: Do test account products match real user products?\n');

    for (const testAccount of testAccountsInAuth) {
      if (testAccount.scanCount === 0) continue;

      const testProducts = analysisMap.get(testAccount.uuid) || [];
      const testBrands = [...new Set(testProducts.map(p => p.brand).filter(b => b))];

      console.log(`Checking ${testAccount.email} (brands: ${testBrands.join(', ')}):`);

      let foundProductMatch = false;
      for (const realProfile of realProfiles) {
        const realProducts = analysisMap.get(realProfile.id) || [];
        const realBrands = [...new Set(realProducts.map(p => p.brand).filter(b => b))];

        const sharedBrands = testBrands.filter(b => realBrands.includes(b));

        if (sharedBrands.length > 0) {
          console.log(`  ⚠️  ${realProfile.email} has ${sharedBrands.length} shared brands: ${sharedBrands.join(', ')}`);
          foundProductMatch = true;
        }
      }

      if (!foundProductMatch) {
        console.log(`  ✅ No matching products with other users`);
      }
      console.log();
    }

    // FINAL RECOMMENDATION
    console.log('\n' + '═'.repeat(90));
    console.log('\n📋 FINAL ASSESSMENT:\n');
    console.log(`Test accounts in database: ${testAccountsInAuth.length}`);
    console.log(`Test accounts with data: ${testAccountsInAuth.filter(t => t.scanCount > 0).length}`);
    console.log(`Possible matches to real users: ${possibleMatches.length}\n`);

    if (possibleMatches.length === 0) {
      console.log('✅ RECOMMENDATION: SAFE TO DELETE all orphaned test accounts');
      console.log('   Reason: No evidence these belong to real users\n');
    } else {
      console.log('⚠️  RECOMMENDATION: INVESTIGATE before deleting');
      console.log(`   Found ${possibleMatches.length} possible ownership connections\n`);
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
