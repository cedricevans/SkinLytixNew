import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              CHECKING FOR OTHER ORPHANED TEST ACCOUNTS WITH DATA                 ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

(async () => {
  try {
    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .order('email', { ascending: true });

    // Get all analyses
    const { data: analyses } = await supabase
      .from('user_analyses')
      .select('user_id');

    // Group analyses by user_id
    const analysesByUser = new Map();
    analyses.forEach(a => {
      if (!analysesByUser.has(a.user_id)) {
        analysesByUser.set(a.user_id, 0);
      }
      analysesByUser.set(a.user_id, analysesByUser.get(a.user_id) + 1);
    });

    // Find test accounts with data
    console.log('🔍 CHECKING FOR TEST ACCOUNTS WITH DATA:\n');

    const testAccountsWithData = profiles.filter(p => 
      (p.email.includes('test') || p.email.includes('beta')) && 
      analysesByUser.has(p.id) && 
      analysesByUser.get(p.id) > 0
    );

    if (testAccountsWithData.length === 0) {
      console.log('✅ No test accounts have data\n');
    } else {
      console.log(`⚠️  FOUND ${testAccountsWithData.length} TEST ACCOUNTS WITH DATA:\n`);
      testAccountsWithData.forEach(acc => {
        const count = analysesByUser.get(acc.id);
        console.log(`   📧 ${acc.email}`);
        console.log(`      UUID: ${acc.id}`);
        console.log(`      Scans: ${count}\n`);
      });
    }

    // Show summary of all users with analyses
    console.log('\n' + '─'.repeat(90));
    console.log('\n📊 ALL USERS WITH ANALYSES (sorted by count):\n');

    const usersWithData = Array.from(analysesByUser.entries())
      .map(([userId, count]) => {
        const profile = profiles.find(p => p.id === userId);
        return {
          email: profile?.email || `ORPHANED (${userId.substring(0, 8)}...)`,
          uuid: userId,
          count: count,
          isTest: profile?.email?.includes('test') || profile?.email?.includes('beta')
        };
      })
      .sort((a, b) => b.count - a.count);

    usersWithData.forEach((user, idx) => {
      const icon = user.isTest ? '🧪' : '👤';
      console.log(`${String(idx + 1).padStart(2)}. ${icon} ${user.count.toString().padStart(3)} scans | ${user.email}`);
    });

    // Find any orphaned UUIDs (have data but no profile)
    console.log('\n\n' + '─'.repeat(90));
    console.log('\n⚠️  CHECKING FOR ORPHANED DATA (analyses with no matching profile):\n');

    const profileIds = new Set(profiles.map(p => p.id));
    const orphanedAnalyses = Array.from(analysesByUser.entries())
      .filter(([userId]) => !profileIds.has(userId));

    if (orphanedAnalyses.length === 0) {
      console.log('✅ No orphaned data found\n');
    } else {
      console.log(`❌ FOUND ${orphanedAnalyses.length} ORPHANED ANALYSIS RECORDS:\n`);
      orphanedAnalyses.forEach(([uuid, count]) => {
        console.log(`   💥 UUID: ${uuid}`);
        console.log(`      Scans: ${count}\n`);
      });
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
