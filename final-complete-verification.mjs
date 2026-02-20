import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function finalVerification() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║       FINAL COMPLETE VERIFICATION - ALL 78 USERS            ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // 1. Get total counts
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    const { count: scanCount } = await supabase
      .from('user_analyses')
      .select('*', { count: 'exact' });

    console.log(`\n✅ SUMMARY:\n`);
    console.log(`  Total users: ${userCount}`);
    console.log(`  Total scans: ${scanCount}`);

    // 2. Get top 20 users with most scans
    const { data: allScans } = await supabase
      .from('user_analyses')
      .select('user_id');

    const scansByUser = {};
    allScans?.forEach(scan => {
      scansByUser[scan.user_id] = (scansByUser[scan.user_id] || 0) + 1;
    });

    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .order('created_at');

    console.log(`\n🏆 TOP 20 USERS BY SCAN COUNT:\n`);

    const userList = users?.map(u => ({
      ...u,
      scanCount: scansByUser[u.id] || 0
    })) || [];

    const sorted = userList.sort((a, b) => b.scanCount - a.scanCount);

    sorted.slice(0, 20).forEach((u, idx) => {
      const status = u.scanCount > 0 ? '✅' : '⚠️';
      console.log(`  ${idx + 1}. ${status} ${u.email}: ${u.scanCount} scans`);
    });

    // 3. Count users by scan brackets
    const brackets = {
      '0 scans': sorted.filter(u => u.scanCount === 0).length,
      '1-5 scans': sorted.filter(u => u.scanCount > 0 && u.scanCount <= 5).length,
      '6-10 scans': sorted.filter(u => u.scanCount > 5 && u.scanCount <= 10).length,
      '11-20 scans': sorted.filter(u => u.scanCount > 10 && u.scanCount <= 20).length,
      '21-50 scans': sorted.filter(u => u.scanCount > 20 && u.scanCount <= 50).length,
      '50+ scans': sorted.filter(u => u.scanCount > 50).length,
    };

    console.log(`\n📊 DISTRIBUTION BY SCAN COUNT:\n`);
    Object.entries(brackets).forEach(([bracket, count]) => {
      console.log(`  ${bracket}: ${count} users`);
    });

    // 4. Check for orphans
    const validUserIds = new Set(users?.map(u => u.id) || []);
    const orphaned = (allScans || []).filter(s => !validUserIds.has(s.user_id));

    console.log(`\n🔍 DATA INTEGRITY:\n`);
    console.log(`  Orphaned scans (FK violations): ${orphaned.length}`);
    console.log(`  Data integrity status: ${orphaned.length === 0 ? '✅ CLEAN' : '❌ ISSUES'}`);

    // 5. Check critical users
    const criticalUsers = [
      { email: 'adupass', uuid: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a' },
      { email: 'cedric.evans@gmail.com', uuid: '80c09810-90de-4c89-8fa2-8ccc2f5ce8c6' },
      { email: 'james', uuid: '4d732879-4cfa-49c1-8b6a-328e707a0428' },
    ];

    console.log(`\n⭐ CRITICAL USERS:\n`);
    for (const cu of criticalUsers) {
      const count = scansByUser[cu.uuid] || 0;
      const status = count > 0 ? '✅' : '⚠️';
      const user = users?.find(u => u.id === cu.uuid);
      console.log(`  ${status} ${user?.email || cu.email}: ${count} scans`);
    }

    // 6. Check Adupass roles
    const { data: adupassRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', '4efb5df3-ce0a-40f6-ae13-6defa1610d3a');

    console.log(`\n👤 ADUPASS ROLE CONFIGURATION:\n`);
    if (adupassRoles && adupassRoles.length > 0) {
      console.log(`  Roles assigned: ${adupassRoles.map(r => r.role).join(', ')}`);
      const hasAdmin = adupassRoles.some(r => r.role === 'admin');
      const hasModerator = adupassRoles.some(r => r.role === 'moderator');
      console.log(`  ✅ Admin role: ${hasAdmin ? 'YES' : 'NO'}`);
      console.log(`  ✅ Moderator role: ${hasModerator ? 'YES' : 'NO'}`);
      console.log(`  ✅ Can access StudentReviewer: ${hasModerator ? 'YES' : 'NO'}`);
    }

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║                    ✅ VERIFICATION COMPLETE                ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

finalVerification();
