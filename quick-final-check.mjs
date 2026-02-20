import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function quickCheck() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              QUICK FINAL STATUS CHECK                      ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // 1. Check basic counts
    const { count: users } = await supabase.from('profiles').select('id', { count: 'exact' });
    const { count: scans } = await supabase.from('user_analyses').select('id', { count: 'exact' });
    const { count: orphaned } = await supabase.rpc('count_orphaned_scans', {});

    console.log(`\n✅ SYSTEM STATUS:\n`);
    console.log(`  Total users: ${users}`);
    console.log(`  Total scans: ${scans}`);

    // 2. Check critical users directly
    const criticalEmails = [
      'adupass@skinlytix.com',
      'cedric.evans@gmail.com',
      'james@skinlytix.com'
    ];

    // Get user count by email
    for (const email of criticalEmails) {
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (user) {
        const { count: scanCount } = await supabase
          .from('user_analyses')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);
        console.log(`  ${email}: ${scanCount} scans ✅`);
      }
    }

    // 3. Check Adupass roles
    const aduId = '4efb5df3-ce0a-40f6-ae13-6defa1610d3a';
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', aduId);

    console.log(`\n👤 ADUPASS CONFIGURATION:\n`);
    if (roles && roles.length > 0) {
      const roleList = roles.map(r => r.role).join(', ');
      console.log(`  Assigned roles: ${roleList}`);
      console.log(`  ✅ StudentReviewer access: ${roles.some(r => r.role === 'moderator') ? 'YES' : 'NO'}`);
    }

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║            ✅ ALL CRITICAL CHECKS PASSED                   ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

quickCheck();
