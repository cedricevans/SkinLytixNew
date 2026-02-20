import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function investigateFKErrors() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     INVESTIGATE FK CONSTRAINT VIOLATIONS                   ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // Get all scans in database
    console.log('📊 Fetching all scans from database...\n');
    const { data: allScans, error: scanError } = await supabase
      .from('user_analyses')
      .select('id, user_id')
      .order('id');

    if (scanError) {
      console.error('Error fetching scans:', scanError);
      return;
    }

    console.log(`✅ Total scans in database: ${allScans?.length || 0}\n`);

    // Get all valid user IDs
    console.log('👤 Fetching all valid users...\n');
    const { data: allUsers, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .order('id');

    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }

    const validUserIds = new Set(allUsers?.map(u => u.id) || []);
    console.log(`✅ Total valid users: ${validUserIds.size}\n`);

    // Find orphaned scans (invalid user_id references)
    console.log('🔍 Checking for orphaned scans...\n');
    const orphanedScans = (allScans || []).filter(scan => !validUserIds.has(scan.user_id));

    if (orphanedScans.length > 0) {
      console.log(`⚠️  Found ${orphanedScans.length} orphaned scans:\n`);
      orphanedScans.forEach(scan => {
        console.log(`  • Scan: ${scan.id}`);
        console.log(`    User ID: ${scan.user_id} ❌ (INVALID)`);
      });
    } else {
      console.log('✅ No orphaned scans found!\n');
    }

    // Get CSV data
    console.log('📖 Reading CSV to find expected data...\n');
    const fs = await import('fs');
    const csvPath = 'supabase/user_analyses-export-2026-02-18_12-45-38.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    console.log(`✅ CSV contains ${lines.length - 1} scans (excluding header)\n`);

    // Parse unique user IDs from CSV
    const csvUserIds = new Set();
    lines.slice(1).forEach(line => {
      const [, userId] = line.split(';');
      if (userId) csvUserIds.add(userId);
    });

    console.log(`📊 Unique user IDs in CSV: ${csvUserIds.size}\n`);

    // Find users in CSV but not in database
    const csvOnlyUsers = Array.from(csvUserIds).filter(uid => !validUserIds.has(uid));
    if (csvOnlyUsers.length > 0) {
      console.log(`⚠️  Found ${csvOnlyUsers.length} user IDs in CSV but NOT in profiles table:\n`);
      csvOnlyUsers.forEach(uid => {
        const scansCount = lines.slice(1).filter(line => line.split(';')[1] === uid).length;
        console.log(`  • User ID: ${uid} (${scansCount} scans in CSV) ❌ USER DOESN'T EXIST`);
      });
    } else {
      console.log('✅ All CSV user IDs exist in profiles table\n');
    }

    // Count scans by status
    console.log('\n📈 SCAN COUNT SUMMARY:\n');
    console.log(`  • Expected (CSV): ${lines.length - 1}`);
    console.log(`  • Current (DB): ${allScans?.length || 0}`);
    console.log(`  • Missing: ${(lines.length - 1) - (allScans?.length || 0)}`);

  } catch (err) {
    console.error('❌ Fatal error:', err);
  }
}

investigateFKErrors();
