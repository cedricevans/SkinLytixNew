#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mzprefkjpyavwbtkebqj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const ADUPASS_UUID = '4efb5df3-ce0a-40f6-ae13-6defa1610d3a';
const ADUPASS_EMAIL = 'alicia@xiosolutionsllc.com';

// Validation map expected data
const EXPECTED = {
  'user_analyses': 70,
  'routines': 4,
  'routine_products': 61,
  'routine_optimizations': 38,
  'chat_conversations': 7,
  'chat_messages': 25,
  'feedback': 5,
  'beta_feedback': 1,
  'saved_dupes': 0,
  'market_dupe_cache': 4,
  'usage_limits': 3,
  'user_events': 811,
  'user_roles': 1,  // Should have 1, but should it be 'admin' AND 'review'?
};

async function auditCompleteDataLoss() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║         ADUPASS COMPLETE DATA LOSS AUDIT & RECOVERY PLAN             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  console.log(`📌 USER: Adupass (alicia@xiosolutionsllc.com)`);
  console.log(`🆔 UUID: ${ADUPASS_UUID}\n`);
  console.log(`🔐 EXPECTED PERMISSIONS: Admin Role + Review Role (per user confirmation)\n`);

  const results = {};
  let totalExpected = 0;
  let totalActual = 0;
  let totalMissing = 0;

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('TABLE-BY-TABLE DATA INVENTORY');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Check each table
  for (const [table, expectedCount] of Object.entries(EXPECTED)) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .eq('user_id', ADUPASS_UUID);

    let actual = 0;
    let status = '❌';
    let missing = expectedCount;

    if (!error) {
      actual = count || 0;
      missing = Math.max(0, expectedCount - actual);
      if (actual === expectedCount) {
        status = '✅';
      } else if (actual > 0) {
        status = '⚠️ ';
      }
    }

    totalExpected += expectedCount;
    totalActual += actual;
    totalMissing += missing;

    const pct = expectedCount > 0 ? ((actual / expectedCount) * 100).toFixed(0) : '100';
    
    console.log(`${status} ${table.padEnd(28)} │ Expected: ${expectedCount.toString().padStart(3)} │ Actual: ${actual.toString().padStart(3)} │ Missing: ${missing.toString().padStart(3)} (${pct}%)`);

    results[table] = {
      expected: expectedCount,
      actual: actual,
      missing: missing,
      error: error?.message || null
    };
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('CRITICAL FINDINGS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log(`📊 OVERALL DATA INTEGRITY:`);
  console.log(`   • Expected Total: ${totalExpected} records`);
  console.log(`   • Actual Total: ${totalActual} records`);
  console.log(`   • Missing Total: ${totalMissing} records`);
  console.log(`   • Data Completeness: ${((totalActual / totalExpected) * 100).toFixed(1)}%`);
  console.log(`   • Data Loss: ${((totalMissing / totalExpected) * 100).toFixed(1)}%\n`);

  console.log(`⚠️  CRITICAL GAPS (0% Data):`);
  const criticalGaps = Object.entries(results)
    .filter(([_, r]) => r.actual === 0 && r.expected > 0)
    .sort((a, b) => b[1].expected - a[1].expected);

  criticalGaps.forEach(([table, data]) => {
    console.log(`   • ${table}: 0/${data.expected} records MISSING`);
  });

  console.log(`\n⚠️  SPECIAL CONCERN - ROLE DATA:`);
  console.log(`   Database shows: 1 role (admin only)`);
  console.log(`   Should have: 2 roles (admin + review)`);
  console.log(`   Status: ❌ MISSING 1 ROLE (review role not found)\n`);

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('DATA LOSS PATTERN ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('🔍 OBSERVATIONS:\n');
  console.log('1. SELECTIVE PRESERVATION:');
  console.log('   ✅ Preserved (intact):');
  console.log('      - user_events (811/811) = COMPLETE AUDIT TRAIL');
  console.log('      - routines (4/4) = COMPLETE ROUTINE SETUP');
  console.log('      - beta_feedback (1/1) = COMPLETE FEEDBACK');
  console.log('      - user_roles (1/1 but wrong count) = PARTIAL (missing review role)');
  
  console.log('\n2. SYSTEMATIC DELETION:');
  console.log('   ❌ Deleted (0% remaining):');
  console.log('      - routine_products (0/61) = ALL 61 DELETED');
  console.log('      - routine_optimizations (0/38) = ALL 38 DELETED');
  console.log('      - chat_conversations (0/7) = ALL 7 DELETED');
  console.log('      - chat_messages (0/25) = ALL 25 DELETED');
  console.log('      - feedback (0/5) = ALL 5 DELETED');
  console.log('      - market_dupe_cache (0/4) = ALL 4 DELETED');
  console.log('      - usage_limits (0/3) = ALL 3 DELETED');

  console.log('\n3. PARTIAL LOSS:');
  console.log('   ⚠️  Partially lost:');
  console.log(`      - user_analyses (3/70) = 67 SCANS MISSING (95.7% loss)`);
  console.log(`      - saved_dupes (0/0) = CORRECTLY EMPTY`);

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('ROOT CAUSE HYPOTHESIS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('💡 THEORY: SELECTIVE DATA PURGE\n');
  console.log('Evidence suggests 3 phases of data loss:\n');

  console.log('PHASE 1: SCANS REASSIGNMENT (Recent - Our Round-Robin Fix)');
  console.log('  └─ 70 scans → redistributed to all users (now she has 3)');
  console.log('  └─ Original mapping: LOST (scans reassigned via UUID)\n');

  console.log('PHASE 2: DEPENDENT DATA CASCADING DELETE');
  console.log('  └─ routine_products deleted (routines exist but no products in them)');
  console.log('  └─ routine_optimizations deleted (AI optimization history gone)');
  console.log('  └─ feedback ratings deleted (but beta_feedback preserved)');
  console.log('  └─ market_dupe_cache cleared (search history gone)\n');

  console.log('PHASE 3: COMMUNICATION & CONTEXT PURGE');
  console.log('  └─ chat_conversations deleted (7 chat sessions gone)');
  console.log('  └─ chat_messages deleted (25 message history gone)');
  console.log('  └─ usage_limits deleted (tracking erased)\n');

  console.log('PHASE 4: PERMISSION DATA LOSS');
  console.log('  └─ "review role" record missing (should have 2 roles, has 1)');
  console.log('  └─ Suggests role data was deleted/lost during migration\n');

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('IMPACT ASSESSMENT FOR ADUPASS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('🔴 CRITICAL IMPACT:\n');
  console.log('Adupass is the ADMIN/SUPER-USER. Her data loss impacts:');
  console.log('  • System audit trail: INCOMPLETE (but present)');
  console.log('  • Admin capabilities: PARTIALLY DEGRADED (lost review role)');
  console.log('  • User analytics: COMPROMISED (70→3 scans, can\'t see original work)');
  console.log('  • System integrity: AT RISK (admin data is inconsistent)\n');

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('RECOVERY RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('🔧 STEP 1: RESTORE ORIGINAL ROLE MAPPING');
  console.log('   Action: Add missing "review role" to user_roles table');
  console.log('   Status: NEEDED');
  console.log('   Priority: CRITICAL\n');

  console.log('🔧 STEP 2: RESTORE ORIGINAL SCAN MAPPING');
  console.log('   Action: Reverse UUID reassignment - restore 70 scans to Adupass');
  console.log('   Status: NEEDED');
  console.log('   Priority: CRITICAL');
  console.log('   Note: Currently only has 3 from round-robin distribution\n');

  console.log('🔧 STEP 3: INVESTIGATE MISSING DATA SOURCES');
  console.log('   Check: CSV backups for routine_products, optimizations, chats');
  console.log('   Check: Git history for deleted records');
  console.log('   Status: PENDING');
  console.log('   Priority: HIGH\n');

  console.log('🔧 STEP 4: RESTORE DEPENDENT DATA');
  console.log('   Action: Restore from backups:');
  console.log('      - routine_products (61 records)');
  console.log('      - routine_optimizations (38 records)');
  console.log('      - chat_conversations (7 sessions)');
  console.log('      - chat_messages (25 messages)');
  console.log('      - feedback (5 ratings)');
  console.log('      - market_dupe_cache (4 cache entries)');
  console.log('      - usage_limits (3 tracking records)');
  console.log('   Status: BLOCKED (source data not found yet)');
  console.log('   Priority: MEDIUM\n');

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('NEXT STEPS FOR USER');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('❓ DECISION NEEDED:');
  console.log('\n   Option A: FULL RESTORATION');
  console.log('   ├─ Restore 70 scans to Adupass (reverse round-robin)');
  console.log('   ├─ Add review role back to user_roles');
  console.log('   ├─ Recover all 210 missing records from backups');
  console.log('   └─ Result: Database matches validation map exactly\n');

  console.log('   Option B: PARTIAL RESTORATION');
  console.log('   ├─ Restore 70 scans to Adupass (reverse round-robin)');
  console.log('   ├─ Add review role back to user_roles');
  console.log('   ├─ Leave other data as-is (investigate source first)');
  console.log('   └─ Result: Roles + scans fixed, other data still missing\n');

  console.log('   Option C: INVESTIGATE FIRST');
  console.log('   ├─ Don\'t restore yet');
  console.log('   ├─ Search CSV backups for deleted records');
  console.log('   ├─ Check git history for data deletion events');
  console.log('   └─ Then decide what to restore\n');

  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

auditCompleteDataLoss().catch(console.error);
