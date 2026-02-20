#!/usr/bin/env node

/**
 * FIX UUID MISATTRIBUTION - PART 1: ANALYSIS & MAPPING
 * 
 * This script analyzes the scan data to create a mapping of which scans
 * belong to which users based on the git backup validation map.
 * 
 * Strategy: Since we have 78 correct UUIDs and 173 scans with product metadata,
 * we can use heuristics to match scans to users:
 * 1. First, identify users who have SOME correct scans (baseline)
 * 2. Look for patterns in product names/dates
 * 3. Use the git backup to understand expected distribution
 * 4. Create reassignment queries
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function analyzeAndFixScans() {
  console.log('🔍 ANALYZING SCANS FOR CORRECT USER ASSIGNMENT...\n');

  // Get all scans with full details
  const { data: scans } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name, brand, category, analyzed_at')
    .order('analyzed_at');

  // Get all profiles to map UUID to names
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .order('email');

  const emailToProfile = {};
  const uuidToProfile = {};
  profiles.forEach(p => {
    emailToProfile[p.email] = p;
    uuidToProfile[p.id] = p;
  });

  // Load the analysis from previous run
  const analysis = JSON.parse(fs.readFileSync('uuid-mismatch-analysis.json', 'utf8'));

  console.log('📊 SCAN DISTRIBUTION:');
  console.log(`Total scans: ${scans.length}`);
  console.log(`Total users: ${profiles.length}`);
  console.log(`Scans per user (average): ${(scans.length / profiles.length).toFixed(1)}\n`);

  // Group scans by current UUID
  const scansByUUID = {};
  scans.forEach(scan => {
    if (!scansByUUID[scan.user_id]) {
      scansByUUID[scan.user_id] = [];
    }
    scansByUUID[scan.user_id].push(scan);
  });

  // Display key observation
  console.log('🎯 KEY OBSERVATION:');
  console.log(
    `Most scans are concentrated in a few UUIDs:\n`
  );

  const uuidCounts = Object.entries(scansByUUID)
    .map(([uuid, scans]) => ({
      uuid,
      count: scans.length,
      user: uuidToProfile[uuid]?.display_name || 'Unknown',
      email: uuidToProfile[uuid]?.email || 'unknown@example.com',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  uuidCounts.forEach(item => {
    console.log(`  ${item.user.padEnd(25)} (${item.email.padEnd(35)}): ${item.count} scans`);
  });

  console.log('\n\n⚠️  PROBLEM IDENTIFIED:');
  console.log('The issue is that users who signed up early (like Adupass, Cedric, James)');
  console.log('received all subsequent scans uploaded by OTHER users.');
  console.log('This is a UUID collision where new scans got assigned to wrong user_id foreign keys.\n');

  // The solution: We need to match scans to users somehow
  // Since product metadata alone won't work (no clear pattern),
  // We should check the git backup for the ORIGINAL user_analyses records

  console.log('💡 SOLUTION:');
  console.log('We need to check the git backup SQL dump to see which scans originally');
  console.log('belonged to which users, then we can reassign them back to correct UUIDs.\n');

  // Check if backup SQL exists
  const backupPath = '/tmp/skinlytix-beta-final/docs/database/data-backup-small-tables.sql';
  if (fs.existsSync(backupPath)) {
    console.log(`✅ Found backup SQL at: ${backupPath}`);
    console.log('   We can parse this to extract original scan-to-UUID mappings.\n');
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    totalScans: scans.length,
    totalUsers: profiles.length,
    scanDistribution: uuidCounts,
    observation: 'Scans are concentrated in early-signup users (Adupass, Cedric, James)',
    nextStep: 'Parse git backup SQL to get original scan-to-UUID mappings',
  };

  fs.writeFileSync('scan-distribution-analysis.json', JSON.stringify(report, null, 2));
  console.log('✅ Analysis saved to: scan-distribution-analysis.json');
}

analyzeAndFixScans().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
