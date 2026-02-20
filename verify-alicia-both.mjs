import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('🔐 VERIFYING ALICIA (OWNER) - BOTH ACCOUNTS\n');

// Account 1: alicia@skinlytix.com (Free tier)
const { data: alicia1 } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'alicia@skinlytix.com')
  .single();

if (alicia1) {
  console.log('✅ ACCOUNT 1: alicia@skinlytix.com (Free Tier)');
  console.log(`   UUID: ${alicia1.id}`);
  console.log(`   Display Name: ${alicia1.display_name}`);
  
  const { data: scans1 } = await supabase
    .from('user_analyses')
    .select('id, product_name, brand')
    .eq('user_id', alicia1.id);
  
  console.log(`   Scans: ${scans1.length} / 4 ${scans1.length === 4 ? '✅' : '❌'}`);
  
  const { data: routines1 } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', alicia1.id);
  
  console.log(`   Routines: ${routines1.length} / 1\n`);
} else {
  console.log('❌ MISSING: alicia@skinlytix.com\n');
}

// Account 2: alicia@xiosolutionsllc.com (Adupass - Admin)
const { data: alicia2 } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'alicia@xiosolutionsllc.com')
  .single();

if (alicia2) {
  console.log('✅ ACCOUNT 2: alicia@xiosolutionsllc.com (Adupass - ADMIN)');
  console.log(`   UUID: ${alicia2.id}`);
  console.log(`   Display Name: ${alicia2.display_name}`);
  console.log(`   Tier: ${alicia2.subscription_tier}`);
  
  const { data: scans2 } = await supabase
    .from('user_analyses')
    .select('id, product_name, brand')
    .eq('user_id', alicia2.id);
  
  console.log(`   Scans: ${scans2.length} / 70 ${scans2.length === 70 ? '✅' : '❌'}`);
  
  const { data: role } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', alicia2.id);
  
  console.log(`   Admin Role: ${role.length > 0 ? '✅' : '❌'}`);
  
  const { data: events } = await supabase
    .from('user_events')
    .select('*')
    .eq('user_id', alicia2.id);
  
  console.log(`   Events: ${events.length} / 811 ${events.length === 811 ? '✅' : '⚠️'}\n`);
} else {
  console.log('❌ MISSING: alicia@xiosolutionsllc.com (CRITICAL!)\n');
}

console.log('═'.repeat(70));
if (alicia1 && alicia2 && alicia1.id && alicia2.id && alicia2.display_name === 'Adupass') {
  console.log('✅ ALICIA VERIFIED: Both accounts present and correct');
} else {
  console.log('❌ ALICIA ISSUE: Check results above');
}

