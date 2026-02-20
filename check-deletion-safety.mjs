import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

const DELETED_EMAILS = [
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

const LEGITIMATE_78_USERS = [
  'alicia@xiosolutionsllc.com',
  'support@skinlytix.com',
  'skylarxiomara@gmail.com',
  'giger.shawnika@gmail.com',
  'jones.k.kevin@gmail.com',
  'skifle3@gmail.com',
  'denaenicole@comcast.net',
  'pdupass@gmail.com',
  'exdupass@gmail.com',
  'autumnanniase@icloud.com',
  'axdupass@yahoo.com',
  'james.goodnight05@gmail.com',
  'icruse125@gmail.com',
  'alton.jx@gmail.com',
  'daniele@toolhouse.ai',
  'joneskkevin@gmail.com',
  'angelagrant.a@gmail.com',
  'kharris488@gmail.com',
  'livwilson105@gmail.com',
  'victor.hicks@codingwithculture.com',
  'chriseothomas@gmail.com',
  'crtny_sumpter@yahoo.com',
  'cyntressadickey@yahoo.com',
  'kristi.hector@gmail.com',
  'tiffany@outlook.con',
  'nate.p233@gmail.com',
  'milagrosestherfiguereo@gmail.com',
  'jamienewby11@gmail.com',
  'a.dupass@gmail.com',
  'ejowharah@yahoo.com',
  'ct_hammonds@yahoo.com',
  'andrecosby87@gmail.com',
  'gtjumperzo@gmail.com',
  'danax16@gmail.com',
  'shanellebwilliams@gmail.com',
  'lkinlock407@yahoo.com',
  'hello@thechloebrand.com',
  'beckyb4a@gmail.com',
  'aricaratcliff@gmail.com',
  'jonesk.kevin@gmail.com',
  'whitenc@yahoo.com',
  'anita.swift89@gmail.com',
  'millyfiguereo@gmail.com',
  'dinadellis@gmail.com',
  'traviaungolden@gmail.com',
  'mimih23@gmail.com',
  'candicem1920@gmail.com',
  'autley10@yahoo.com',
  'drobin090664@yahoo.com',
  'montesa0505@gmail.com',
  'kevin.reeves11@gmail.com',
  'william.watkins@salesforce.com',
  'ameriewhiten@gmail.com',
  'taylorsmith.tcs@gmail.com',
  'cowartjames09@gmail.com',
  'alyssa.gomez827@gmail.com',
  'gteurika@gmail.com',
  'kimkelly.law@gmail.com',
  'sandramccullough@yahoo.com',
  'suarez1920@gmail.com',
  'taylorwhitetiff@aol.com',
  't_revere@yahoo.com',
  'chenaewyatt@yahoo.com',
  'zitbrown@yahoo.com',
  'ladygist1@gmail.com',
  'janea92590@gmail.com',
  'mashriley29@gmail.com',
  'ssuziesuarez@gmail.com',
  'kendrickg123@yahoo.com',
  'reginehill6@gmail.com',
  'cedric.evans@gmail.com',
  'darye@wellcrafted.us',
  'pte295@gmail.com',
  'stacey.s.suarez@atl.frb.org',
  'alicia@skinlytix.com',
  'pevans@clatyb.com',
  'indigowebdesigns@gmail.com',
  'csg11779@icloud.com'
];

(async () => {
  try {
    console.log('🔍 VERIFICATION: Checking if legitimate users were accidentally deleted\n');

    const { data: currentProfiles } = await supabase
      .from('profiles')
      .select('email');

    const currentEmails = new Set(currentProfiles.map(p => p.email));

    console.log('MISSING LEGITIMATE USERS (should exist but dont):\n');

    let missing = 0;
    const missingUsers = [];
    
    for (const email of LEGITIMATE_78_USERS) {
      if (!currentEmails.has(email)) {
        console.log(`  ❌ ${email}`);
        missingUsers.push(email);
        missing++;
      }
    }

    if (missing === 0) {
      console.log('  ✅ None - all legitimate users are still in database\n');
    } else {
      console.log(`\n⚠️  ${missing} legitimate users are MISSING!\n`);
      process.exit(1);
    }

    console.log('DELETED ACCOUNTS - VERIFICATION:\n');
    
    let legitAccidentiallyDeleted = 0;
    for (const email of DELETED_EMAILS) {
      const isLegitimate = LEGITIMATE_78_USERS.includes(email);
      if (isLegitimate) {
        console.log(`  ⚠️  LEGITIMATE ACCOUNT DELETED: ${email}`);
        legitAccidentiallyDeleted++;
      } else {
        console.log(`  ✅ Test account deleted: ${email}`);
      }
    }

    if (legitAccidentiallyDeleted > 0) {
      console.log(`\n⚠️  ERROR: ${legitAccidentiallyDeleted} legitimate accounts were accidentally deleted!`);
      process.exit(1);
    }

    console.log('\n✅ CLEANUP WAS CORRECT: Only test accounts were deleted');
    console.log(`   Current profiles in database: ${currentProfiles.length}`);
    console.log(`   Expected legitimate users: ${LEGITIMATE_78_USERS.length}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
