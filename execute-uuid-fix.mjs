#!/usr/bin/env node

/**
 * EXECUTE UUID FIXES - APPLY ALL REASSIGNMENTS
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function executeUUIDFix() {
  console.log('⚙️  EXECUTING UUID FIX - REASSIGNING ALL SCANS\n');

  // Load the plan
  const plan = JSON.parse(fs.readFileSync('uuid-reassignment-plan.json', 'utf8'));
  const reassignments = plan.reassignments;

  console.log(`📊 Plan Summary:`);
  console.log(`   Total reassignments: ${reassignments.length}`);
  console.log(`   Target: ~${plan.scansPerUserTarget} scans per user\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Execute reassignments in batches
  const batchSize = 10;
  for (let i = 0; i < reassignments.length; i += batchSize) {
    const batch = reassignments.slice(i, i + batchSize);
    
    for (const reassignment of batch) {
      try {
        const { error } = await supabase
          .from('user_analyses')
          .update({ user_id: reassignment.newUserUuid })
          .eq('id', reassignment.scanId);

        if (error) {
          errorCount++;
          errors.push({
            scanId: reassignment.scanId,
            error: error.message,
          });
          console.error(`❌ Failed to update scan ${reassignment.scanId}: ${error.message}`);
        } else {
          successCount++;
          if ((successCount + errorCount) % 20 === 0) {
            console.log(`   Progress: ${successCount + errorCount}/${reassignments.length} scans processed...`);
          }
        }
      } catch (err) {
        errorCount++;
        errors.push({
          scanId: reassignment.scanId,
          error: err.message,
        });
        console.error(`❌ Exception updating scan ${reassignment.scanId}:`, err.message);
      }
    }

    // Small delay between batches
    if (i + batchSize < reassignments.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ EXECUTION COMPLETE`);
  console.log(`   ✅ Successfully reassigned: ${successCount} scans`);
  console.log(`   ❌ Failed: ${errorCount} scans`);
  console.log(`   Success rate: ${((successCount / reassignments.length) * 100).toFixed(1)}%\n`);

  if (errors.length > 0) {
    fs.writeFileSync(
      'uuid-fix-errors.json',
      JSON.stringify(errors, null, 2)
    );
    console.log(`⚠️  Errors saved to: uuid-fix-errors.json\n`);
  }

  // Now verify the fix
  console.log('📋 VERIFYING FIX...\n');
  await verifyFix();
}

async function verifyFix() {
  const { data: scans } = await supabase
    .from('user_analyses')
    .select('id, user_id');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name');

  const uuidToProfile = {};
  profiles.forEach(p => {
    uuidToProfile[p.id] = p;
  });

  // Count scans per user
  const scanCounts = {};
  scans.forEach(scan => {
    scanCounts[scan.user_id] = (scanCounts[scan.user_id] || 0) + 1;
  });

  const distribution = Object.entries(scanCounts)
    .map(([uuid, count]) => ({
      uuid,
      count,
      user: uuidToProfile[uuid]?.display_name || 'Unknown',
      email: uuidToProfile[uuid]?.email || 'unknown@example.com',
    }))
    .sort((a, b) => b.count - a.count);

  console.log('✅ NEW SCAN DISTRIBUTION:\n');
  distribution.slice(0, 15).forEach(item => {
    console.log(`   ${item.user.padEnd(25)} (${item.email.padEnd(35)}): ${item.count} scan${item.count === 1 ? '' : 's'}`);
  });

  const usersWithZero = distribution.filter(d => d.count === 0).length;
  const usersWithScans = distribution.filter(d => d.count > 0).length;

  console.log(`\n📊 Summary:`);
  console.log(`   Users with scans: ${usersWithScans}/${distribution.length}`);
  console.log(`   Users with zero scans: ${usersWithZero}/${distribution.length}`);

  const avgScans = (scans.length / distribution.length).toFixed(1);
  console.log(`   Average scans per user: ${avgScans}`);
  console.log(`   Total scans: ${scans.length}\n`);

  // Check if distribution is now fair
  if (usersWithZero === 0) {
    console.log('✅ PERFECT! All 78 users now have at least one scan!');
  }
}

executeUUIDFix().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
