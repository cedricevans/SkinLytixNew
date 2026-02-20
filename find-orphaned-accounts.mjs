import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

// The 78 official users from the export
const officialUsers = [
  'alicia@xiosolutionsllc.com', 'support@skinlytix.com', 'skylarxiomara@gmail.com', 'giger.shawnika@gmail.com',
  'jones.k.kevin@gmail.com', 'skifle3@gmail.com', 'denaenicole@comcast.net', 'pdupass@gmail.com',
  'exdupass@gmail.com', 'autumnanniase@icloud.com', 'axdupass@yahoo.com', 'james.goodnight05@gmail.com',
  'icruse125@gmail.com', 'alton.jx@gmail.com', 'daniele@toolhouse.ai', 'joneskkevin@gmail.com',
  'angelagrant.a@gmail.com', 'kharris488@gmail.com', 'livwilson105@gmail.com', 'victor.hicks@codingwithculture.com',
  'chriseothomas@gmail.com', 'crtny_sumpter@yahoo.com', 'cyntressadickey@yahoo.com', 'kristi.hector@gmail.com',
  'tiffany@outlook.con', 'nate.p233@gmail.com', 'milagrosestherfiguereo@gmail.com', 'jamienewby11@gmail.com',
  'a.dupass@gmail.com', 'ejowharah@yahoo.com', 'ct_hammonds@yahoo.com', 'andrecosby87@gmail.com',
  'gtjumperzo@gmail.com', 'danax16@gmail.com', 'shanellebwilliams@gmail.com', 'lkinlock407@yahoo.com',
  'hello@thechloebrand.com', 'beckyb4a@gmail.com', 'aricaratcliff@gmail.com', 'jonesk.kevin@gmail.com',
  'whitenc@yahoo.com', 'anita.swift89@gmail.com', 'millyfiguereo@gmail.com', 'dinadellis@gmail.com',
  'traviaungolden@gmail.com', 'mimih23@gmail.com', 'candicem1920@gmail.com', 'autley10@yahoo.com',
  'drobin090664@yahoo.com', 'montesa0505@gmail.com', 'kevin.reeves11@gmail.com', 'william.watkins@salesforce.com',
  'ameriewhiten@gmail.com', 'taylorsmith.tcs@gmail.com', 'cowartjames09@gmail.com', 'alyssa.gomez827@gmail.com',
  'gteurika@gmail.com', 'kimkelly.law@gmail.com', 'sandramccullough@yahoo.com', 'suarez1920@gmail.com',
  'taylorwhitetiff@aol.com', 't_revere@yahoo.com', 'chenaewyatt@yahoo.com', 'zitbrown@yahoo.com',
  'ladygist1@gmail.com', 'janea92590@gmail.com', 'mashriley29@gmail.com', 'ssuziesuarez@gmail.com',
  'kendrickg123@yahoo.com', 'reginehill6@gmail.com', 'cedric.evans@gmail.com', 'darye@wellcrafted.us',
  'pte295@gmail.com', 'stacey.s.suarez@atl.frb.org', 'alicia@skinlytix.com', 'pevans@clatyb.com',
  'indigowebdesigns@gmail.com', 'csg11779@icloud.com'
];

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║          IDENTIFYING ORPHANED/DUPLICATE ACCOUNTS TO DELETE                      ║');
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

    console.log(`📊 COMPARISON:\n`);
    console.log(`Official users list: ${officialUsers.length}`);
    console.log(`Profiles in database: ${profiles.length}`);
    console.log(`Difference: ${profiles.length - officialUsers.length}\n`);

    // Find accounts in database NOT in official list
    const orphanedAccounts = profiles.filter(p => 
      !officialUsers.includes(p.email)
    );

    console.log('─'.repeat(90));
    console.log(`\n🗑️  ORPHANED ACCOUNTS (in database but NOT in official 78-user list):\n`);

    if (orphanedAccounts.length === 0) {
      console.log('   (none) ✅\n');
    } else {
      console.log(`Found ${orphanedAccounts.length} orphaned accounts:\n`);
      orphanedAccounts.forEach(acc => {
        const scanCount = analysesByUser.get(acc.id) || 0;
        console.log(`   🗑️  ${acc.email}`);
        console.log(`       UUID: ${acc.id}`);
        console.log(`       Scans: ${scanCount}\n`);
      });
    }

    // Find duplicate emails
    console.log('─'.repeat(90));
    console.log('\n⚠️  CHECKING FOR DUPLICATE EMAILS:\n');

    const emailCounts = new Map();
    profiles.forEach(p => {
      emailCounts.set(p.email, (emailCounts.get(p.email) || 0) + 1);
    });

    const duplicates = Array.from(emailCounts.entries())
      .filter(([email, count]) => count > 1);

    if (duplicates.length === 0) {
      console.log('   (none) ✅\n');
    } else {
      console.log(`Found ${duplicates.length} duplicate emails:\n`);
      duplicates.forEach(([email, count]) => {
        const uuids = profiles.filter(p => p.email === email);
        console.log(`   ⚠️  ${email} (${count} accounts)`);
        uuids.forEach(u => {
          const scanCount = analysesByUser.get(u.id) || 0;
          console.log(`       - ${u.id} (${scanCount} scans)`);
        });
        console.log();
      });
    }

    // Summary
    console.log('─'.repeat(90));
    console.log('\n✅ SUMMARY:\n');
    console.log(`Official users: ${officialUsers.length}`);
    console.log(`Actual profiles: ${profiles.length}`);
    console.log(`Orphaned accounts: ${orphanedAccounts.length}`);
    console.log(`Duplicate emails: ${duplicates.length}\n`);

    if (orphanedAccounts.length > 0) {
      console.log('⚠️  RECOMMENDATION: Delete all orphaned accounts\n');
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
