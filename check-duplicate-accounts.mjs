import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              CHECKING FOR DUPLICATE PROFILES & MISROUTED DATA                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

(async () => {
  try {
    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email');

    // Group by email
    const emailGroups = new Map();
    profiles.forEach(p => {
      if (!emailGroups.has(p.email)) {
        emailGroups.set(p.email, []);
      }
      emailGroups.get(p.email).push(p.id);
    });

    // Find emails with multiple UUIDs (duplicates)
    console.log('🔍 CHECKING FOR DUPLICATE ACCOUNTS:\n');
    let duplicateCount = 0;

    for (const [email, uuids] of emailGroups) {
      if (uuids.length > 1) {
        duplicateCount++;
        console.log(`⚠️  DUPLICATE: ${email}`);
        console.log(`    Has ${uuids.length} different UUIDs:\n`);
        
        for (const uuid of uuids) {
          const { data: analyses } = await supabase
            .from('user_analyses')
            .select('id', { count: 'exact' })
            .eq('user_id', uuid);
          
          const count = analyses?.length || 0;
          console.log(`    - ${uuid} → ${count} analyses`);
        }
        console.log();
      }
    }

    if (duplicateCount === 0) {
      console.log('✅ No duplicate accounts found\n');
    }

    // Now check the 22 users with 0 analyses for patterns
    console.log('\n📊 CHECKING 22 USERS WITH NO ANALYSES:\n');

    const { data: emptyUsers } = await supabase
      .from('profiles')
      .select('id, email');

    const { data: allAnalyses } = await supabase
      .from('user_analyses')
      .select('user_id');

    const usersWithAnalyses = new Set(allAnalyses.map(a => a.user_id));
    const usersWithoutAnalyses = emptyUsers.filter(u => !usersWithAnalyses.has(u.id));

    console.log(`Found ${usersWithoutAnalyses.length} users with 0 analyses\n`);

    // Group them by email domain to find patterns
    const byDomain = new Map();
    usersWithoutAnalyses.forEach(u => {
      const domain = u.email.split('@')[1];
      if (!byDomain.has(domain)) {
        byDomain.set(domain, []);
      }
      byDomain.get(domain).push(u.email);
    });

    console.log('GROUPED BY EMAIL DOMAIN:\n');
    for (const [domain, emails] of byDomain) {
      console.log(`📧 @${domain} (${emails.length} users)`);
      emails.forEach(e => console.log(`    - ${e}`));
      console.log();
    }

    // Look for test accounts
    const testAccounts = usersWithoutAnalyses.filter(u => 
      u.email.includes('test') || u.email.includes('beta')
    );

    console.log(`\n🧪 TEST/BETA ACCOUNTS: ${testAccounts.length}\n`);
    testAccounts.forEach(a => {
      console.log(`   ${a.email}`);
    });

    // Real users with no data
    const realUsers = usersWithoutAnalyses.filter(u => 
      !u.email.includes('test') && !u.email.includes('beta')
    );

    console.log(`\n👤 REAL USERS WITH NO DATA: ${realUsers.length}\n`);
    realUsers.forEach(u => {
      console.log(`   ${u.email} (UUID: ${u.id.substring(0, 8)}...)`);
    });

    if (realUsers.length > 0) {
      console.log('\n⚠️  ACTION NEEDED: These real users may have data under test accounts');
      console.log('    Need to check if they have analyses under wrong UUIDs');
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
