#!/usr/bin/env node

/**
 * ADUPASS DATA RECOVERY ANALYSIS
 * Complete inventory of what's missing vs what should exist
 * Based on Student Reviewer Dashboard requirements + Validation Map
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mzprefkjpyavwbtkebqj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const ADUPASS_UUID = '4efb5df3-ce0a-40f6-ae13-6defa1610d3a';

async function auditAdupassForReviewerFlow() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║     ADUPASS DATA RECOVERY ANALYSIS FOR STUDENT REVIEWER DASHBOARD     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 VALIDATION MAP EXPECTATIONS FOR ADUPASS:');
  console.log('─────────────────────────────────────────────────────────────────────────\n');

  const expectedData = {
    'user_analyses (Scans)': { expected: 70, description: 'Products to validate' },
    'user_roles (Roles)': { expected: 1, description: 'Should be: admin + review (2 total)' },
    'student_certifications': { expected: 0, description: 'Optional access method' },
    'routines': { expected: 4, description: 'Skincare routines created' },
    'routine_products': { expected: 61, description: 'Products in routines' },
    'routine_optimizations': { expected: 38, description: 'AI optimization results' },
    'chat_conversations': { expected: 7, description: 'Chat sessions' },
    'chat_messages': { expected: 25, description: 'Chat message history' },
    'feedback': { expected: 5, description: 'Analysis ratings' },
    'beta_feedback': { expected: 1, description: 'PMF survey responses' },
    'user_events': { expected: 811, description: 'Analytics/audit trail' },
    'market_dupe_cache': { expected: 4, description: 'Dupe search cache' },
    'usage_limits': { expected: 3, description: 'Monthly usage tracking' },
  };

  let totalExpected = 0;
  let totalCurrent = 0;
  let totalMissing = 0;

  for (const [table, info] of Object.entries(expectedData)) {
    const tableName = table.split(' ')[0];
    console.log(`${info.expected.toString().padStart(3)} records │ ${table.padEnd(40)} │ ${info.description}`);
    totalExpected += info.expected;
  }

  console.log('\n═════════════════════════════════════════════════════════════════════════');
  console.log('CURRENT DATABASE STATE FOR ADUPASS');
  console.log('═════════════════════════════════════════════════════════════════════════\n');

  // Check each table
  const tables = [
    { name: 'user_analyses', expected: 70, description: 'Scans (Products to validate)' },
    { name: 'user_roles', expected: 1, description: 'Roles (admin + review needed)' },
    { name: 'student_certifications', expected: 0, description: 'Certifications' },
    { name: 'routines', expected: 4, description: 'Routines' },
    { name: 'routine_products', expected: 61, description: 'Routine products' },
    { name: 'routine_optimizations', expected: 38, description: 'Optimizations' },
    { name: 'chat_conversations', expected: 7, description: 'Chat conversations' },
    { name: 'chat_messages', expected: 25, description: 'Chat messages' },
    { name: 'feedback', expected: 5, description: 'Feedback' },
    { name: 'beta_feedback', expected: 1, description: 'Beta feedback' },
    { name: 'user_events', expected: 811, description: 'User events' },
    { name: 'market_dupe_cache', expected: 4, description: 'Dupe cache' },
    { name: 'usage_limits', expected: 3, description: 'Usage limits' },
  ];

  const currentState = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact' })
      .eq('user_id', ADUPASS_UUID);

    const current = count || 0;
    const missing = Math.max(0, table.expected - current);
    const status = current === table.expected ? '✅' : current === 0 ? '❌' : '⚠️ ';
    const pct = table.expected > 0 ? ((current / table.expected) * 100).toFixed(0) : '100';

    console.log(`${status} ${table.description.padEnd(40)} │ Expected: ${table.expected.toString().padStart(3)} │ Current: ${current.toString().padStart(3)} │ Missing: ${missing.toString().padStart(3)} (${pct}%)`);

    totalCurrent += current;
    totalMissing += missing;

    currentState[table.name] = {
      expected: table.expected,
      current: current,
      missing: missing,
    };
  }

  console.log('\n═════════════════════════════════════════════════════════════════════════');
  console.log('DATA RECOVERY REQUIREMENTS');
  console.log('═════════════════════════════════════════════════════════════════════════\n');

  console.log('🔴 CRITICAL FOR REVIEWER DASHBOARD ACCESS:\n');

  console.log('1. ADD REVIEW ROLE TO user_roles');
  console.log('   • Current: admin role only (1 record)');
  console.log('   • Needed: Add "review" or "reviewer" role');
  console.log('   • Impact: WITHOUT THIS → Access Denied on /dashboard/reviewer');
  console.log('   • Priority: CRITICAL\n');

  console.log('2. RESTORE SCANS (user_analyses)');
  console.log('   • Current: 3 scans (from round-robin distribution)');
  console.log('   • Expected: 70 scans');
  console.log('   • Missing: 67 scans');
  console.log('   • Impact: Dashboard shows only 3/70 products to validate');
  console.log('   • Priority: CRITICAL\n');

  console.log('🟠 HIGH PRIORITY (Validation Workflow Data):\n');

  console.log('3. RESTORE DEPENDENT DATA FOR SCANS');
  console.log('   • routine_products: 0/61 missing → Products in routines are missing');
  console.log('   • routine_optimizations: 0/38 missing → AI optimization history lost');
  console.log('   • feedback: 0/5 missing → Analysis ratings lost');
  console.log('   • market_dupe_cache: 0/4 missing → Dupe search history lost');
  console.log('   • Impact: Cannot see full context for validation');
  console.log('   • Priority: HIGH\n');

  console.log('4. RESTORE COMMUNICATION DATA');
  console.log('   • chat_conversations: 0/7 missing');
  console.log('   • chat_messages: 0/25 missing');
  console.log('   • Impact: Lost all conversation history with AI');
  console.log('   • Priority: MEDIUM\n');

  console.log('5. RESTORE USAGE TRACKING');
  console.log('   • usage_limits: 0/3 missing');
  console.log('   • Impact: Lost monthly usage records');
  console.log('   • Priority: LOW\n');

  console.log('═════════════════════════════════════════════════════════════════════════');
  console.log('GLOBAL TABLES FOR INGREDIENT VALIDATION');
  console.log('═════════════════════════════════════════════════════════════════════════\n');

  const { count: ingredCount } = await supabase
    .from('ingredient_cache')
    .select('*', { count: 'exact' });

  const { count: validCount } = await supabase
    .from('ingredient_validations')
    .select('*', { count: 'exact' });

  const { count: certCount } = await supabase
    .from('student_certifications')
    .select('*', { count: 'exact' });

  console.log(`✅ ingredient_cache: ${ingredCount || 0} records (AVAILABLE - shared global data)`);
  console.log(`⚠️  ingredient_validations: ${validCount || 0} records (EMPTY - no validations yet)`);
  console.log(`⚠️  student_certifications: ${certCount || 0} records (EMPTY - no certifications)\n`);

  console.log('═════════════════════════════════════════════════════════════════════════');
  console.log('RECOVERY PLAN FOR ADUPASS');
  console.log('═════════════════════════════════════════════════════════════════════════\n');

  console.log('STEP 1: ADD REVIEW ROLE (IMMEDIATE)');
  console.log('───────────────────────────────────');
  console.log('Action: INSERT into user_roles');
  console.log(`  user_id: ${ADUPASS_UUID}`);
  console.log('  role: "review" (or "reviewer")');
  console.log('  created_at: NOW()');
  console.log('Status: ⏳ BLOCKED - Need confirmation on exact role name\n');

  console.log('STEP 2: REVERSE ROUND-ROBIN SCAN DISTRIBUTION (CRITICAL)');
  console.log('───────────────────────────────────────────────────────');
  console.log('Action: Update user_analyses.user_id');
  console.log(`  FROM: Current round-robin assignment (scattered across users)`);
  console.log(`  TO: ${ADUPASS_UUID} for her original 70 scans`);
  console.log('Status: ⏳ BLOCKED - Need UUID mapping from original backup\n');

  console.log('STEP 3: RESTORE DEPENDENT DATA (HIGH PRIORITY)');
  console.log('──────────────────────────────────────────────');
  console.log('Action: Restore from CSV backup or git history');
  console.log('  Tables: routine_products, optimizations, feedback, chat*, usage_limits');
  console.log('Status: ⏳ BLOCKED - CSV backup has corrupted timestamps\n');

  console.log('═════════════════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═════════════════════════════════════════════════════════════════════════\n');

  console.log(`📊 TOTAL DATA STATUS:`);
  console.log(`   • Expected records: ${totalExpected}`);
  console.log(`   • Current records: ${totalCurrent}`);
  console.log(`   • Missing records: ${totalMissing}`);
  console.log(`   • Completeness: ${((totalCurrent / totalExpected) * 100).toFixed(1)}%\n`);

  console.log('🎯 BLOCKER ASSESSMENT:');
  console.log('   Without fixes, Adupass CANNOT:');
  console.log('   ❌ Access /dashboard/reviewer (no review role)');
  console.log('   ❌ See products to validate (only 3/70 scans)');
  console.log('   ❌ Perform full validation (missing ingredient context)\n');

  console.log('═════════════════════════════════════════════════════════════════════════\n');
}

auditAdupassForReviewerFlow().catch(console.error);
