import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function quickVerify() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║    QUICK VERIFY: 78 USERS + SCAN DISTRIBUTION              ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // Get count of users
    const { count: userCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' });

    // Get count of scans
    const { count: scanCount } = await supabase
      .from('user_analyses')
      .select('id', { count: 'exact' });

    // Get scan distribution with aggregation
    const { data: distribution } = await supabase
      .from('user_analyses')
      .select('user_id')
      .order('user_id');

    const scansByUser = new Map();
    distribution?.forEach(scan => {
      scansByUser.set(scan.user_id, (scansByUser.get(scan.user_id) || 0) + 1);
    });

    console.log(`\n📊 DATABASE SUMMARY:\n`);
    console.log(`  ✅ Total users: ${userCount}`);
    console.log(`  ✅ Total scans: ${scanCount}`);
    console.log(`  ✅ Users with scans: ${scansByUser.size}`);
    console.log(`  ⚠️  Users without scans: ${userCount - scansByUser.size}`);

    // Get all users to identify who has no scans
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, email')
      .order('email');

    const usersWithoutScans = allUsers?.filter(u => !scansByUser.has(u.id)) || [];

    console.log(`\n🏆 TOP USERS BY SCANS:\n`);
    const topUsers = Array.from(scansByUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    // Get user emails for top users
    for (const [userId, count] of topUsers) {
      const user = allUsers?.find(u => u.id === userId);
      console.log(`  • ${user?.email || userId}: ${count} scans`);
    }

    console.log(`\n⚠️  USERS WITH ZERO SCANS (${usersWithoutScans.length}):\n`);
    usersWithoutScans.slice(0, 15).forEach(u => {
      console.log(`  • ${u.email}`);
    });

    if (usersWithoutScans.length > 15) {
      console.log(`  ... and ${usersWithoutScans.length - 15} more`);
    }

    // Check for orphaned scans
    const orphanedCount = (distribution?.filter(d => !allUsers?.some(u => u.id === d.user_id)) || []).length;

    console.log(`\n🔍 ORPHANED SCANS:\n`);
    console.log(`  Scans with invalid user_id: ${orphanedCount}`);

    if (orphanedCount > 0) {
      const orphaned = distribution?.filter(d => !allUsers?.some(u => u.id === d.user_id));
      console.log(`\n  Orphaned scan IDs:\n`);
      orphaned?.slice(0, 5).forEach(scan => {
        console.log(`    • ${scan.user_id}`);
      });
      if (orphaned?.length > 5) {
        console.log(`    ... and ${orphaned.length - 5} more`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

quickVerify();
