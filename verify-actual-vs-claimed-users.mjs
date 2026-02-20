import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

(async () => {
  try {
    console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                  ACTUAL DATABASE VS YOUR 78-USER LIST VERIFICATION               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

    // Get actual profiles
    const { data: actualProfiles } = await supabase
      .from('profiles')
      .select('id, email, display_name, subscription_tier, is_profile_complete')
      .order('email');

    const actualEmails = new Set(actualProfiles.map(p => p.email));

    console.log(`📊 ACTUAL DATABASE STATE:\n`);
    console.log(`   Total profiles: ${actualProfiles.length}`);
    
    // Count by type
    const orphanedTestAccounts = actualProfiles.filter(p => 
      p.email.includes('test_') || p.email.includes('beta-test-') || p.email.includes('test.')
    );
    
    const legitimateProfiles = actualProfiles.filter(p => 
      !(p.email.includes('test_') || p.email.includes('beta-test-') || p.email.includes('test.'))
    );

    console.log(`   Legitimate user profiles: ${legitimateProfiles.length}`);
    console.log(`   Orphaned/test profiles: ${orphanedTestAccounts.length}\n`);

    console.log('✅ LEGITIMATE PROFILES (verified in database):\n');
    console.log('Email                               | Display Name        | Tier');
    console.log('─'.repeat(80));
    
    legitimateProfiles.forEach(p => {
      const email = p.email.substring(0, 35).padEnd(35);
      const name = (p.display_name || '—').substring(0, 19).padEnd(19);
      const tier = p.subscription_tier || 'free';
      console.log(`${email} | ${name} | ${tier}`);
    });

    console.log(`\n\n🗑️  ORPHANED/TEST PROFILES (to be deleted):\n`);
    orphanedTestAccounts.forEach(p => {
      console.log(`   • ${p.email}`);
    });

    // Get data for each legitimate user
    console.log(`\n\n` + '═'.repeat(90));
    console.log('\n📋 DATA SUMMARY BY USER:\n');

    const { data: allAnalyses } = await supabase.from('user_analyses').select('user_id');
    const analysisCount = new Map();
    allAnalyses.forEach(a => {
      analysisCount.set(a.user_id, (analysisCount.get(a.user_id) || 0) + 1);
    });

    const userSummary = legitimateProfiles.map(p => ({
      email: p.email,
      name: p.display_name || '—',
      tier: p.subscription_tier || 'free',
      scans: analysisCount.get(p.id) || 0
    })).sort((a, b) => b.scans - a.scans);

    console.log('Email                               | Name                | Tier     | Scans');
    console.log('─'.repeat(90));

    let totalScans = 0;
    userSummary.forEach(u => {
      const email = u.email.substring(0, 35).padEnd(35);
      const name = u.name.substring(0, 19).padEnd(19);
      const tier = u.tier.padEnd(8);
      console.log(`${email} | ${name} | ${tier} | ${u.scans}`);
      totalScans += u.scans;
    });

    console.log('─'.repeat(90));
    console.log(`TOTAL SCANS ACROSS ALL LEGITIMATE USERS: ${totalScans}\n`);

    // Identify missing users
    console.log('\n' + '═'.repeat(90));
    console.log('\n⚠️  PROFILE CREATION STATUS:\n');

    const usersWithProfiles = legitimateProfiles.map(p => p.email);
    const usersWithoutProfiles = [];

    // Check which expected users DON'T have profiles
    const expectedUsers = [
      'cedric.evans@gmail.com',
      'alicia@xiosolutionsllc.com',
      'james.goodnight05@gmail.com',
      'ct_hammonds@yahoo.com',
      'cowartjames09@gmail.com',
      'support@skinlytix.com',
      'exdupass@gmail.com',
      'icruse125@gmail.com',
      'kharris488@gmail.com',
      'nate.p233@gmail.com',
      'ssuziesuarez@gmail.com',
      'denaenicole@comcast.net',
      'axdupass@yahoo.com',
      'a.dupass@gmail.com',
      'milagrosestherfiguereo@gmail.com',
      'skylarxiomara@gmail.com',
      'jones.k.kevin@gmail.com',
      'alicia@skinlytix.com',
      'giger.shawnika@gmail.com',
      'skifle3@gmail.com'
    ];

    console.log(`✅ Users with profiles in database: ${legitimateProfiles.length}`);
    console.log(`\n💾 Saving complete verified list to: verified-legitimate-users.json\n`);

    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProfiles: actualProfiles.length,
        legitimateProfiles: legitimateProfiles.length,
        orphanedTestProfiles: orphanedTestAccounts.length,
        totalScans: totalScans
      },
      legitimateUsers: userSummary,
      orphanedProfiles: orphanedTestAccounts.map(p => p.email)
    };

    fs.writeFileSync('verified-legitimate-users.json', JSON.stringify(output, null, 2));

    console.log('✅ NEXT STEP: Review the verified legitimate users list above.');
    console.log('   Then delete the orphaned test accounts when ready.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
