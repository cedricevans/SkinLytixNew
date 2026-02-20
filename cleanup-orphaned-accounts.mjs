import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

// The 78 official users
const officialEmails = new Set([
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
]);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║            FINAL DATA CLEANUP - DELETE ORPHANED TEST ACCOUNTS                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

(async () => {
  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email');

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      process.exit(1);
    }

    // Find orphaned accounts
    const orphanedIds = profiles
      .filter(p => !officialEmails.has(p.email))
      .map(p => p.id);

    console.log('📊 CLEANUP ANALYSIS:\n');
    console.log(`Total profiles in database: ${profiles.length}`);
    console.log(`Official users (to keep): ${officialEmails.size}`);
    console.log(`Orphaned profiles (to delete): ${orphanedIds.length}\n`);

    if (orphanedIds.length === 0) {
      console.log('✅ No orphaned accounts found - database is clean!\n');
      process.exit(0);
    }

    // Show what will be deleted
    console.log('─'.repeat(90));
    console.log('\n🗑️  ACCOUNTS TO DELETE:\n');

    const orphanedProfiles = profiles.filter(p => orphanedIds.includes(p.id));
    orphanedProfiles.forEach(p => {
      console.log(`   ${p.email} (UUID: ${p.id})`);
    });

    console.log('\n' + '─'.repeat(90));
    console.log('\n⚠️  DELETE PLAN:\n');
    console.log('This will DELETE from all tables where user_id matches:\n');
    console.log('  1. user_analyses');
    console.log('  2. routines');
    console.log('  3. routine_products');
    console.log('  4. saved_dupes');
    console.log('  5. market_dupe_cache');
    console.log('  6. chat_conversations');
    console.log('  7. feedback');
    console.log('  8. beta_feedback');
    console.log('  9. usage_limits');
    console.log('  10. user_events');
    console.log('  11. profiles\n');

    console.log('Ready to execute? Confirm by running with --confirm flag\n');

    // Check for --confirm flag
    const args = process.argv.slice(2);
    if (!args.includes('--confirm')) {
      console.log('Example: node cleanup-orphaned-accounts.mjs --confirm\n');
      process.exit(0);
    }

    // DELETE PHASE
    console.log('═'.repeat(90));
    console.log('\n🔥 EXECUTING CLEANUP...\n');

    for (const uuid of orphanedIds) {
      process.stdout.write(`Deleting ${uuid.substring(0, 8)}... `);

      try {
        // Delete from all tables
        await Promise.all([
          supabase.from('user_analyses').delete().eq('user_id', uuid),
          supabase.from('routines').delete().eq('user_id', uuid),
          supabase.from('routine_products').delete().eq('user_id', uuid),
          supabase.from('saved_dupes').delete().eq('user_id', uuid),
          supabase.from('market_dupe_cache').delete().eq('user_id', uuid),
          supabase.from('chat_conversations').delete().eq('user_id', uuid),
          supabase.from('feedback').delete().eq('user_id', uuid),
          supabase.from('beta_feedback').delete().eq('user_id', uuid),
          supabase.from('usage_limits').delete().eq('user_id', uuid),
          supabase.from('user_events').delete().eq('user_id', uuid),
        ]);

        // Delete profile last
        await supabase.from('profiles').delete().eq('id', uuid);

        console.log('✅');
      } catch (err) {
        console.log(`⚠️  ${err.message}`);
      }
    }

    // Verify
    console.log('\n' + '─'.repeat(90));
    console.log('\n✅ VERIFICATION:\n');

    const { data: finalProfiles } = await supabase
      .from('profiles')
      .select('id, email');

    console.log(`Profiles remaining: ${finalProfiles.length}`);
    console.log(`Official users expected: ${officialEmails.size}`);

    if (finalProfiles.length === officialEmails.size) {
      console.log('\n✅ SUCCESS! Database cleanup complete.\n');
    } else {
      console.log(`\n⚠️  Mismatch: Expected ${officialEmails.size}, found ${finalProfiles.length}\n`);
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
