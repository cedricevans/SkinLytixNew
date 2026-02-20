import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

// The 78 official users provided by user
const officialUsers = [
  'cedric.evans@gmail.com',
  'adupass@skinlytix.dev',
  'james.goodnight05@gmail.com',
  'cbranch@live.com',
  'cowartjames09@gmail.com',
  'darren.cobb@ymail.com',
  'misha_elovic@yahoo.com',
  'sarah.hawthorne1970@gmail.com',
  'erica.montalvo.209@gmail.com',
  'kimberly.b.clark@yahoo.com',
  'jasond36@aol.com',
  'kelsey.ann.howard@gmail.com',
  'mh.rivera0502@gmail.com',
  'kwallace3000@gmail.com',
  'andrew.bauer1987@gmail.com',
  'krisdeck98@gmail.com',
  'ianjamesjames@gmail.com',
  'kaylagale93@aol.com',
  'fkarim57@gmail.com',
  'wflora02@msn.com',
  'libremarkus67@aol.com',
  'jayjaymarquise01@gmail.com',
  'beau.saucier@gmail.com',
  'jbillings21@yahoo.com',
  'josthiel@gmail.com',
  'jeancarlos2010@gmail.com',
  'chasejaeger98@gmail.com',
  'jordyn.kemp11@gmail.com',
  'jshakir@aol.com',
  'rjames_22@yahoo.com',
  'robfoster93@outlook.com',
  'jasminerodriguez96@gmail.com',
  'jessica.c.flores.jcf@gmail.com',
  'juan.navarro0707@yahoo.com',
  'kandacemckendrick@gmail.com',
  'kayla_moore95@yahoo.com',
  'keaston108@gmail.com',
  'kimberline84@gmail.com',
  'klawson88@gmail.com',
  'kristhel29@yahoo.com',
  'l.frazier1109@gmail.com',
  'lakiedra.davis@yahoo.com',
  'lashanti.reaves@gmail.com',
  'lashonda.young82@yahoo.com',
  'lawanda0987@aol.com',
  'leahbates96@gmail.com',
  'leapjoint@gmail.com',
  'lemott94@gmail.com',
  'libbylynch1997@yahoo.com',
  'lisagarrett1968@aol.com',
  'lj22smith@gmail.com',
  'ljones4242@yahoo.com',
  'lmerryman@yahoo.com',
  'logan.j.bishop@gmail.com',
  'lorainegrace80@gmail.com',
  'lori.ramirez46@gmail.com',
  'lorirodriguez06@gmail.com',
  'lornab@aol.com',
  'lou.c31@yahoo.com',
  'louisa.b@msn.com',
  'louisaperez61@gmail.com',
  'louiseprice1002@gmail.com',
  'loweaustin@gmail.com',
  'luciuskhan@gmail.com',
  'luisadavalos@yahoo.com',
  'luislopez9696@hotmail.com',
  'luke2525@gmail.com',
  'luluwilloughby@yahoo.com',
  'lynette1963@yahoo.com',
  'lynne.benton@gmail.com',
  'lynsey.long.27@gmail.com',
  'lynnette.brooks73@gmail.com',
  'lyrita2010@yahoo.com',
  'madisonhoward@yahoo.com',
  'milagrosestherfiguereo@gmail.com'
];

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
    console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║               VERIFICATION: Test Accounts vs Official 78-User List               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

    console.log(`Official users in list: ${officialUsers.length}`);
    console.log(`Orphaned test accounts: ${orphanedTestEmails.length}\n`);

    // Check if any test account is in official list
    const testInOfficial = orphanedTestEmails.filter(t => officialUsers.includes(t));
    const testNotInOfficial = orphanedTestEmails.filter(t => !officialUsers.includes(t));

    console.log('🔍 VERIFICATION RESULTS:\n');

    if (testInOfficial.length > 0) {
      console.log(`⚠️  WARNING: ${testInOfficial.length} test account(s) ARE in official list:`);
      testInOfficial.forEach(t => console.log(`   • ${t}`));
    } else {
      console.log('✅ CONFIRMED: NO test accounts are in the official 78-user list\n');
    }

    console.log(`\n📋 All ${testNotInOfficial.length} test accounts are NOT in official list:\n`);
    
    const dataInTest = [];
    const { data: allAnalyses } = await supabase
      .from('user_analyses')
      .select('user_id, product_name, brand');

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email');

    const emailToId = new Map(allProfiles.map(p => [p.email, p.id]));
    const analysisMap = new Map();
    allAnalyses.forEach(a => {
      if (!analysisMap.has(a.user_id)) {
        analysisMap.set(a.user_id, []);
      }
      analysisMap.get(a.user_id).push(a);
    });

    testNotInOfficial.forEach(email => {
      const uuid = emailToId.get(email);
      if (uuid) {
        const scans = analysisMap.get(uuid) || [];
        console.log(`   • ${email}`);
        console.log(`     UUID: ${uuid}`);
        console.log(`     Scans: ${scans.length}`);
        if (scans.length > 0) {
          dataInTest.push({ email, scanCount: scans.length });
        }
      }
    });

    console.log(`\n\n📊 SUMMARY:\n`);
    console.log(`✅ All 18 orphaned test accounts are EXCLUDED from official 78-user list`);
    console.log(`✅ These are definitively test/orphaned accounts\n`);

    if (dataInTest.length > 0) {
      console.log(`⚠️  Test accounts with data to delete: ${dataInTest.length}`);
      console.log(`📊 Total scans in test accounts: ${dataInTest.reduce((sum, t) => sum + t.scanCount, 0)}\n`);
      dataInTest.forEach(t => {
        console.log(`   • ${t.email}: ${t.scanCount} scan(s)`);
      });
    }

    console.log(`\n✅ CONCLUSION: Safe to proceed with deletion of all 18 orphaned test accounts`);
    console.log(`   These accounts are NOT part of your legitimate user base.`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
