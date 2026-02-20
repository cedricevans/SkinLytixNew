import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

(async () => {
  try {
    console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                 RESTORING ALL 78 USERS FROM BACKUP profiles.json                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

    // Read the backup JSON file
    const profilesJson = JSON.parse(fs.readFileSync('/Users/cedricevans/Downloads/Work_Station/Skinlytix/supabase/profiles.json', 'utf-8'));

    console.log(`📂 Loaded ${profilesJson.length} profiles from backup\n`);

    // Filter out test_* accounts that were deleted
    const testEmails = new Set([
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
      'test_8963@test.com',
      'beta-test-1757619142857@example.com',
      'beta-test-1758659296143@example.com',
      'test.user@skinlytix.dev'
    ]);

    // Get currently existing profiles
    const { data: currentProfiles } = await supabase
      .from('profiles')
      .select('id, email');

    const currentEmails = new Set(currentProfiles.map(p => p.email));

    console.log(`📊 Current profiles in database: ${currentProfiles.length}\n`);

    // Restore missing profiles
    let restored = 0;
    let skipped = 0;
    let failed = 0;

    for (const profile of profilesJson) {
      // Skip test accounts
      if (testEmails.has(profile.email)) {
        skipped++;
        continue;
      }

      // Skip if already exists
      if (currentEmails.has(profile.email)) {
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('profiles')
        .insert(profile);

      if (!error) {
        console.log(`✅ Restored: ${profile.email} (${profile.display_name})`);
        restored++;
      } else {
        console.log(`❌ Failed: ${profile.email} - ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 RESULTS:\n`);
    console.log(`✅ Restored: ${restored} users`);
    console.log(`⏭️  Skipped (already exist or test accounts): ${skipped}`);
    console.log(`❌ Failed: ${failed} users`);

    // Verify final count
    const { data: finalProfiles } = await supabase
      .from('profiles')
      .select('id, email');

    console.log(`\n💾 Final profile count: ${finalProfiles.length}`);
    console.log(`   Expected: 78 (minus test accounts)\n`);

    if (finalProfiles.length >= 60) {
      console.log('✅ SUCCESS: Database has been restored!\n');
    }

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
})();
