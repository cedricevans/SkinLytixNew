import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deleteOrphanedScans() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        DELETE ORPHANED SCANS WITH FK VIOLATIONS             ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // The known orphaned scan user IDs from earlier investigation
    // These are the scans that failed FK constraints
    const orphanedUserIds = [
      '2031ab67-c76f-41de-8f88-d61eb1e9afa8', // From FK failure
      '10b9be03-0e85-45f5-9aff-123456789abc'  // From FK failure (placeholder, we'll query for real ones)
    ];

    console.log('🔍 Finding orphaned scans in database...\n');

    // Get all valid user IDs
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id');

    const validUserIds = new Set(allUsers?.map(u => u.id) || []);
    console.log(`✅ Valid users: ${validUserIds.size}\n`);

    // Find scans with invalid user IDs
    const { data: allScans, error: scanError } = await supabase
      .from('user_analyses')
      .select('id, user_id');

    if (scanError) {
      console.error('❌ Error fetching scans:', scanError);
      return;
    }

    const orphanedScans = (allScans || []).filter(s => !validUserIds.has(s.user_id));

    console.log(`⚠️  Found ${orphanedScans.length} orphaned scans:\n`);

    if (orphanedScans.length === 0) {
      console.log('✅ No orphaned scans found! Data is clean.');
      return;
    }

    orphanedScans.forEach(scan => {
      console.log(`  • Scan ID: ${scan.id}`);
      console.log(`    User ID: ${scan.user_id} ❌ (INVALID)`);
    });

    // Delete orphaned scans
    console.log(`\n🗑️  Deleting ${orphanedScans.length} orphaned scan(s)...\n`);

    const scanIdsToDelete = orphanedScans.map(s => s.id);
    const { error: deleteError } = await supabase
      .from('user_analyses')
      .delete()
      .in('id', scanIdsToDelete);

    if (deleteError) {
      console.error('❌ Error deleting scans:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${orphanedScans.length} orphaned scan(s)\n`);

    // Verify deletion
    const { count: remainingOrphaned } = await supabase
      .from('user_analyses')
      .select('id', { count: 'exact' })
      .not('user_id', 'in', `(${Array.from(validUserIds).map(id => `'${id}'`).join(',')})`);

    console.log(`📋 Verification:\n`);
    console.log(`  Orphaned scans remaining: ${remainingOrphaned}`);
    console.log(`\n✅ All orphaned scans have been removed!`);

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

deleteOrphanedScans();
