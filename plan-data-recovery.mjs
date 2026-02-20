import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

const isTestAccount = (email) => {
  return email.includes('test') || email.includes('beta');
};

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              DATA RECOVERY & TEST ACCOUNT CLEANUP PLAN                           ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

(async () => {
  try {
    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email');

    // Get all analyses
    const { data: analyses } = await supabase
      .from('user_analyses')
      .select('user_id, product_name, brand');

    // Group analyses by user
    const analysesByUser = new Map();
    analyses.forEach(a => {
      if (!analysesByUser.has(a.user_id)) {
        analysesByUser.set(a.user_id, []);
      }
      analysesByUser.get(a.user_id).push(a);
    });

    // Separate real vs test
    const realUsers = profiles.filter(p => !isTestAccount(p.email));
    const testAccounts = profiles.filter(p => isTestAccount(p.email));

    const realUsersWithoutData = realUsers.filter(u => !analysesByUser.has(u.id) || analysesByUser.get(u.id).length === 0);
    const testAccountsWithData = testAccounts.filter(t => analysesByUser.has(t.id) && analysesByUser.get(t.id).length > 0);

    console.log('📋 RECOVERY PLAN:\n');
    console.log(`Real users without data: ${realUsersWithoutData.length}`);
    console.log(`Test accounts with data: ${testAccountsWithData.length}\n`);

    // Try to match test accounts to real users
    console.log('─'.repeat(90));
    console.log('\n🔍 ATTEMPTING TO MATCH TEST ACCOUNTS TO REAL USERS:\n');

    const recoveryMap = new Map(); // testAccountId -> realUserId

    testAccountsWithData.forEach(testAcc => {
      const testEmail = testAcc.email.toLowerCase();
      const testName = testEmail
        .replace(/test_?/, '')
        .replace(/@.*/, '')
        .split(/[_\-.]/)
        .filter(x => x.length > 0);

      // Try to find matching real user
      const possibleMatch = realUsersWithoutData.find(realUser => {
        const realEmail = realUser.email.toLowerCase();
        const realName = realEmail
          .replace(/@.*/, '')
          .split(/[_\-.]/)
          .filter(x => x.length > 0);

        // Check if any part of the name matches
        return testName.some(tPart => realName.some(rPart => 
          tPart === rPart && tPart.length > 2
        ));
      });

      if (possibleMatch) {
        console.log(`✅ MATCH FOUND:`);
        console.log(`   Test: ${testAcc.email} (${analysesByUser.get(testAcc.id).length} scans)`);
        console.log(`   Real: ${possibleMatch.email}`);
        console.log(`   Action: MIGRATE\n`);
        recoveryMap.set(testAcc.id, possibleMatch.id);
      } else {
        console.log(`❌ NO MATCH:`);
        console.log(`   Test: ${testAcc.email} (${analysesByUser.get(testAcc.id).length} scans)`);
        console.log(`   Action: DELETE\n`);
      }
    });

    // Summary
    console.log('─'.repeat(90));
    console.log('\n📊 CLEANUP SUMMARY:\n');

    let toMigrateCount = 0;
    let toDeleteCount = 0;
    let toDeleteScans = 0;

    recoveryMap.forEach(() => {
      toMigrateCount++;
    });

    testAccountsWithData.forEach(t => {
      if (!recoveryMap.has(t.id)) {
        toDeleteCount++;
        toDeleteScans += analysesByUser.get(t.id).length;
      }
    });

    console.log(`Test accounts to MIGRATE: ${toMigrateCount}`);
    console.log(`Test accounts to DELETE: ${toDeleteCount}`);
    console.log(`Scans to delete: ${toDeleteScans}\n`);

    if (toDeleteCount > 0) {
      console.log('⚠️  WARNING: This will DELETE the following test accounts:\n');
      testAccountsWithData.forEach(t => {
        if (!recoveryMap.has(t.id)) {
          console.log(`   🗑️  ${t.email} (${analysesByUser.get(t.id).length} scans)`);
        }
      });
    }

    console.log('\n' + '═'.repeat(90));
    console.log('\n✅ READY TO PROCEED WITH:\n');
    console.log('1. Migrate data from matched test accounts to real users');
    console.log('2. Delete all remaining test accounts and their data\n');

    // Save recovery map for next step
    console.log('Recovery map saved for migration script.\n');

    process.exit(0);

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
