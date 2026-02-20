import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

const ORPHANED_TEST_ACCOUNTS = [
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

const TABLES_TO_CLEAN = [
  'user_analyses',
  'routines',
  'routine_products',
  'routine_optimizations',
  'chat_conversations',
  'chat_messages',
  'feedback',
  'beta_feedback',
  'saved_dupes',
  'market_dupe_cache',
  'usage_limits',
  'user_roles',
  'user_events'
];

(async () => {
  try {
    console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                     CLEANING ORPHANED TEST ACCOUNTS & DATA                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

    // Get all profiles to find test account UUIDs
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email');

    const testAccountIds = new Map();
    for (const email of ORPHANED_TEST_ACCOUNTS) {
      const profile = allProfiles.find(p => p.email === email);
      if (profile) {
        testAccountIds.set(email, profile.id);
      }
    }

    console.log(`🔍 Found ${testAccountIds.size} test account UUIDs to clean\n`);

    // Track deleted records for report
    const deletionReport = {
      timestamp: new Date().toISOString(),
      deletedAccounts: [],
      totalRecordsDeleted: 0,
      byTable: {}
    };

    // Step 1: Delete data from related tables (foreign key dependencies)
    console.log('🗑️  STEP 1: Deleting associated data from related tables...\n');

    for (const table of TABLES_TO_CLEAN) {
      let deletedCount = 0;
      deletionReport.byTable[table] = 0;

      if (table === 'chat_messages') {
        // Special handling for chat_messages (depends on conversation_id)
        for (const testId of testAccountIds.values()) {
          const { data: conversations } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('user_id', testId);

          if (conversations && conversations.length > 0) {
            for (const conv of conversations) {
              const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('conversation_id', conv.id);

              if (!error) {
                deletedCount++;
              }
            }
          }
        }
      } else {
        // Standard deletion for user_id-based tables
        for (const testId of testAccountIds.values()) {
          const { count, error } = await supabase
            .from(table)
            .delete()
            .eq('user_id', testId);

          if (!error && count) {
            deletedCount += count;
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`   ✓ ${table}: ${deletedCount} records deleted`);
        deletionReport.byTable[table] = deletedCount;
        deletionReport.totalRecordsDeleted += deletedCount;
      }
    }

    console.log(`\n   Total records deleted from data tables: ${deletionReport.totalRecordsDeleted}\n`);

    // Step 2: Delete profiles
    console.log('🗑️  STEP 2: Deleting orphaned test account profiles...\n');

    for (const [email, uuid] of testAccountIds.entries()) {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', uuid);

      if (!error) {
        console.log(`   ✓ Deleted: ${email}`);
        deletionReport.deletedAccounts.push({
          email: email,
          uuid: uuid
        });
      } else {
        console.log(`   ✗ Failed to delete ${email}: ${error.message}`);
      }
    }

    console.log(`\n   Total profiles deleted: ${deletionReport.deletedAccounts.length}\n`);

    // Verification: Count remaining profiles
    console.log('═'.repeat(90));
    console.log('\n✅ VERIFICATION:\n');

    const { data: remainingProfiles } = await supabase
      .from('profiles')
      .select('id, email');

    console.log(`   Remaining profiles in database: ${remainingProfiles.length}`);
    console.log(`   Deleted test accounts: ${deletionReport.deletedAccounts.length}`);
    console.log(`   Expected legitimate users: 45\n`);

    // Verify no test accounts remain
    const remainingEmails = remainingProfiles.map(p => p.email);
    const testAccountsRemaining = ORPHANED_TEST_ACCOUNTS.filter(email =>
      remainingEmails.includes(email)
    );

    if (testAccountsRemaining.length === 0) {
      console.log('✅ CONFIRMED: All orphaned test accounts deleted successfully\n');
    } else {
      console.log(`⚠️  WARNING: ${testAccountsRemaining.length} test accounts still remain:`);
      testAccountsRemaining.forEach(email => console.log(`   • ${email}`));
    }

    // Verify legitimate users still have their data
    console.log('\n📊 Spot-check legitimate users:\n');

    const { data: cedricProfile } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .eq('email', 'cedric.evans@gmail.com')
      .single();

    if (cedricProfile) {
      const { data: cedricScans } = await supabase
        .from('user_analyses')
        .select('id')
        .eq('user_id', cedricProfile.id);

      console.log(`   ✓ cedric.evans@gmail.com: ${cedricScans.length} scans (expected: 25)`);

      if (cedricScans.length === 25) {
        console.log('     ✅ Cedric\'s data verified intact\n');
      } else {
        console.log('     ⚠️  Data count mismatch!\n');
      }
    }

    // Save deletion report
    const reportFile = 'cleanup-orphaned-accounts-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(deletionReport, null, 2));

    console.log('═'.repeat(90));
    console.log('\n✅ CLEANUP COMPLETE!\n');
    console.log(`   📊 Deleted ${deletionReport.totalRecordsDeleted} data records from related tables`);
    console.log(`   🗑️  Deleted ${deletionReport.deletedAccounts.length} orphaned test account profiles`);
    console.log(`   💾 Report saved: ${reportFile}\n`);

    console.log('📌 NEXT STEPS:');
    console.log('   1. Login as cedric.evans@gmail.com and verify all 25 scans are visible');
    console.log('   2. Check other user accounts to confirm their data is intact');
    console.log('   3. Monitor app for any issues with remaining legitimate users\n');

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
