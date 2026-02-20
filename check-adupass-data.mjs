#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const ADUPASS_UUID = '4efb5df3-ce0a-40f6-ae13-6defa1610d3a';

async function checkAdupassData() {
  console.log('🔍 ADUPASS DATA AUDIT\n');
  console.log('Email: alicia@xiosolutionsllc.com');
  console.log(`UUID: ${ADUPASS_UUID}\n`);

  const tables = [
    { name: 'user_analyses', label: 'Scans', expected: 70 },
    { name: 'routines', label: 'Routines', expected: 4 },
    { name: 'routine_products', label: 'Routine Products', expected: 61 },
    { name: 'routine_optimizations', label: 'Optimizations', expected: 38 },
    { name: 'chat_conversations', label: 'Chat Conversations', expected: 7 },
    { name: 'chat_messages', label: 'Chat Messages', expected: 25 },
    { name: 'feedback', label: 'Feedback', expected: 5 },
    { name: 'beta_feedback', label: 'Beta Feedback', expected: 1 },
    { name: 'saved_dupes', label: 'Saved Dupes', expected: 0 },
    { name: 'market_dupe_cache', label: 'Dupe Cache', expected: 4 },
    { name: 'usage_limits', label: 'Usage Limits', expected: 3 },
  ];

  console.log('| Table | Current | Expected | Status |');
  console.log('|---|---|---|---|');

  let totalCurrent = 0;
  let totalExpected = 0;

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table.name)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ADUPASS_UUID);

    const current = error ? 0 : count;
    totalCurrent += current;
    totalExpected += table.expected;

    const status = current === table.expected ? '✅' : '❌';
    const diff = current === table.expected ? '' : ` (${current - table.expected})`;

    console.log(`| ${table.label} | ${current} | ${table.expected} | ${status}${diff} |`);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`TOTAL: ${totalCurrent} current / ${totalExpected} expected`);
  console.log(`Missing: ${totalExpected - totalCurrent} records`);
  console.log('='.repeat(50) + '\n');

  // Get user_events count (analytics)
  const { count: eventsCount } = await supabase
    .from('user_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ADUPASS_UUID);

  console.log(`📊 Additional Data:`);
  console.log(`| User Events (Analytics) | ${eventsCount} | 811 | ${eventsCount === 811 ? '✅' : '❌'} |`);

  // Check admin role
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', ADUPASS_UUID);

  console.log(`| Admin Role | ${roles?.length ? '✅ Admin' : '❌ None'} | ✅ Admin | ${roles?.length ? '✅' : '❌'} |\n`);

  // Get sample scans
  const { data: sampleScans, count: scanCount } = await supabase
    .from('user_analyses')
    .select('id, product_name, brand, analyzed_at', { count: 'exact' })
    .eq('user_id', ADUPASS_UUID)
    .limit(5);

  if (scanCount > 0) {
    console.log('📋 Sample Scans:');
    sampleScans?.forEach((scan, idx) => {
      console.log(`  ${idx + 1}. "${scan.brand} ${scan.product_name}" (${new Date(scan.analyzed_at).toLocaleDateString()})`);
    });
  }
}

checkAdupassData().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
