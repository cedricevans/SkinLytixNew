import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyAllUsers() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         VERIFY ALL 78 USERS - COMPLETE STATUS              ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // Get all 78 users
    console.log('📋 Fetching all users from database...\n');
    const { data: allUsers, error: userError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at');

    if (userError) {
      console.error('Error:', userError);
      return;
    }

    console.log(`✅ Total users: ${allUsers?.length || 0}\n`);

    if (!allUsers || allUsers.length === 0) {
      console.log('❌ No users found!');
      return;
    }

    // Get scan counts for each user
    console.log('📊 Fetching scan counts per user...\n');
    const scanCounts = new Map();

    for (const user of allUsers) {
      const { count } = await supabase
        .from('user_analyses')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      scanCounts.set(user.id, { email: user.email, count: count || 0 });
    }

    // Calculate statistics
    const usersWithScans = Array.from(scanCounts.values()).filter(u => u.count > 0);
    const usersWithoutScans = Array.from(scanCounts.values()).filter(u => u.count === 0);
    const totalScans = Array.from(scanCounts.values()).reduce((sum, u) => sum + u.count, 0);

    console.log('📈 STATISTICS:\n');
    console.log(`  Users with scans: ${usersWithScans.length}`);
    console.log(`  Users without scans: ${usersWithoutScans.length}`);
    console.log(`  Total scans: ${totalScans}\n`);

    // Show top users
    console.log('🏆 TOP 15 USERS BY SCAN COUNT:\n');
    const sorted = Array.from(scanCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15);

    sorted.forEach(([uid, user], idx) => {
      console.log(`  ${idx + 1}. ${user.email} (${user.count} scans)`);
    });

    // Show users with no scans
    console.log(`\n⚠️  USERS WITH NO SCANS (${usersWithoutScans.length}):\n`);
    usersWithoutScans.slice(0, 20).forEach(user => {
      console.log(`  • ${user.email}`);
    });

    if (usersWithoutScans.length > 20) {
      console.log(`  ... and ${usersWithoutScans.length - 20} more`);
    }

    // Check for orphaned scans
    console.log(`\n🔍 CHECKING FOR ORPHANED SCANS...\n`);
    const validUserIds = new Set(allUsers.map(u => u.id));
    const { data: allScans } = await supabase
      .from('user_analyses')
      .select('id, user_id')
      .order('id');

    const orphaned = (allScans || []).filter(s => !validUserIds.has(s.user_id));
    console.log(`  Orphaned scans: ${orphaned.length}\n`);

    if (orphaned.length > 0) {
      console.log(`  ⚠️  Found ${orphaned.length} orphaned scans:\n`);
      orphaned.forEach(scan => {
        console.log(`    • Scan: ${scan.id}`);
        console.log(`      User ID: ${scan.user_id} ❌ (DOES NOT EXIST)`);
      });
    }

    // Summary
    console.log(`\n📊 FINAL SUMMARY:\n`);
    console.log(`  ✅ Total users configured: ${allUsers.length}`);
    console.log(`  ✅ Users with scan data: ${usersWithScans.length}`);
    console.log(`  ⚠️  Users without any scans: ${usersWithoutScans.length}`);
    console.log(`  ✅ Total scans in database: ${totalScans}`);
    console.log(`  ❌ Orphaned scans (no valid user): ${orphaned.length}`);

    if (orphaned.length > 0) {
      console.log(`\n💡 RECOMMENDATION: Delete the ${orphaned.length} orphaned scan(s)`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

verifyAllUsers();
