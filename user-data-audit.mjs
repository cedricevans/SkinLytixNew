import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║        COMPREHENSIVE USER DATA AUDIT - REAL USERS VS TEST ACCOUNTS               ║');
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
      .select('user_id');

    // Group analyses by user
    const analysesByUser = new Map();
    analyses.forEach(a => {
      if (!analysesByUser.has(a.user_id)) {
        analysesByUser.set(a.user_id, 0);
      }
      analysesByUser.set(a.user_id, analysesByUser.get(a.user_id) + 1);
    });

    // Separate real users from test accounts
    const isTestAccount = (email) => {
      return email.includes('test') || 
             email.includes('beta') || 
             email.includes('alicia@xiosolutionsllc.com') ||
             email.includes('support@skinlytix.com');
    };

    const realUsers = profiles.filter(p => !isTestAccount(p.email));
    const testAccounts = profiles.filter(p => isTestAccount(p.email));

    console.log(`📊 USER BREAKDOWN:\n`);
    console.log(`   Real users: ${realUsers.length}`);
    console.log(`   Test accounts: ${testAccounts.length}`);
    console.log(`   Total profiles: ${profiles.length}\n`);

    // Analyze real users
    console.log('─'.repeat(90));
    console.log('\n👤 REAL USERS WITH DATA:\n');

    const realUsersWithData = realUsers
      .filter(u => analysesByUser.has(u.id))
      .map(u => ({ ...u, count: analysesByUser.get(u.id) }))
      .sort((a, b) => b.count - a.count);

    if (realUsersWithData.length === 0) {
      console.log('   (none)\n');
    } else {
      realUsersWithData.forEach(u => {
        console.log(`   ✅ ${u.email} - ${u.count} scans`);
      });
    }

    console.log('\n' + '─'.repeat(90));
    console.log('\n👤 REAL USERS WITH MISSING DATA (0 scans):\n');

    const realUsersWithoutData = realUsers
      .filter(u => !analysesByUser.has(u.id) || analysesByUser.get(u.id) === 0)
      .sort((a, b) => a.email.localeCompare(b.email));

    if (realUsersWithoutData.length === 0) {
      console.log('   (none) ✅\n');
    } else {
      console.log(`   Found ${realUsersWithoutData.length} real users with NO data:\n`);
      realUsersWithoutData.forEach(u => {
        console.log(`   ❌ ${u.email}`);
      });
    }

    // Analyze test accounts
    console.log('\n\n' + '─'.repeat(90));
    console.log('\n🧪 TEST ACCOUNTS WITH DATA:\n');

    const testAccountsWithData = testAccounts
      .filter(t => analysesByUser.has(t.id) && analysesByUser.get(t.id) > 0)
      .map(t => ({ ...t, count: analysesByUser.get(t.id) }))
      .sort((a, b) => b.count - a.count);

    let totalTestData = 0;
    testAccountsWithData.forEach(t => {
      console.log(`   🧪 ${t.email} - ${t.count} scans`);
      totalTestData += t.count;
    });

    console.log(`\n   Total scans in test accounts: ${totalTestData}\n`);

    // Summary
    console.log('─'.repeat(90));
    console.log('\n📋 SUMMARY & ACTION PLAN:\n');

    const totalRealUserData = realUsersWithData.reduce((sum, u) => sum + u.count, 0);
    const totalTestData2 = testAccountsWithData.reduce((sum, t) => sum + t.count, 0);

    console.log(`Real users with data: ${realUsersWithData.length}`);
    console.log(`Real users WITHOUT data: ${realUsersWithoutData.length}`);
    console.log(`Total scans in real user accounts: ${totalRealUserData}`);
    console.log(`\nTest accounts with data: ${testAccountsWithData.length}`);
    console.log(`Total scans in test accounts: ${totalTestData2}`);
    console.log(`\nTotal scans overall: ${totalRealUserData + totalTestData2}\n`);

    if (realUsersWithoutData.length === 0) {
      console.log('✅ GOOD NEWS: All real users have their data linked!\n');
      console.log('🧹 NEXT STEP: Safe to delete all test accounts\n');
    } else {
      console.log('⚠️  WARNING: Some real users are missing data\n');
      console.log('🔍 NEXT STEP: Check if their data is in test accounts\n');
    }

    // Check if any test account names match real user patterns
    console.log('─'.repeat(90));
    console.log('\n🔎 CHECKING FOR DATA RECOVERY CANDIDATES:\n');

    const testAccountsWithPossibleMatches = testAccountsWithData.filter(t => {
      // Try to find if this test account might belong to a real user
      const emailPrefix = t.email.split('@')[0].toLowerCase();
      const testName = emailPrefix.replace(/test_?/, '').replace(/@.*/, '');
      
      const possibleMatch = realUsersWithoutData.find(r => {
        const rName = r.email.split('@')[0].toLowerCase();
        return rName.includes(testName) || testName.includes(rName);
      });

      return possibleMatch;
    });

    if (testAccountsWithPossibleMatches.length === 0) {
      console.log('   (no matches found)\n');
    } else {
      console.log(`   Found ${testAccountsWithPossibleMatches.length} possible matches:\n`);
      testAccountsWithPossibleMatches.forEach(t => {
        console.log(`   ${t.email} (${t.count} scans)`);
      });
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
