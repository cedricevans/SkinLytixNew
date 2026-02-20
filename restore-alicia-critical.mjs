import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    🔐 CRITICAL: RESTORING ALICIA ACCOUNTS                        ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

// 1. Restore Adupass account (admin)
console.log('📋 Step 1: Restoring Adupass account (alicia@xiosolutionsllc.com)...');
const { data: adupass, error: err1 } = await supabase
  .from('profiles')
  .insert({
    id: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a',
    email: 'alicia@xiosolutionsllc.com',
    display_name: 'Adupass',
    subscription_tier: 'premium'
  })
  .select();

if (err1) {
  console.log(`   ❌ Error: ${err1.message}`);
} else {
  console.log('   ✅ Adupass profile created');
}

// 2. Add admin role to Adupass
console.log('\n📋 Step 2: Adding admin role to Adupass...');
const { error: err2 } = await supabase
  .from('user_roles')
  .insert({
    user_id: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a',
    role: 'admin'
  });

if (err2) {
  console.log(`   ❌ Error: ${err2.message}`);
} else {
  console.log('   ✅ Admin role assigned');
}

// 3. Fix alicia@skinlytix.com scans - they're missing!
console.log('\n📋 Step 3: Checking alicia@skinlytix.com account...');
const { data: alicia1 } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', 'alicia@skinlytix.com')
  .single();

if (alicia1) {
  console.log(`   ✅ Account found: ${alicia1.id}`);
  
  // Check if she has the 4 scans
  const { data: scans } = await supabase
    .from('user_analyses')
    .select('*')
    .eq('user_id', alicia1.id);
  
  console.log(`   Current scans: ${scans.length} / 4`);
  
  if (scans.length === 0) {
    console.log('   ⚠️  Missing all 4 scans - they need to be restored from backup');
  }
} else {
  console.log('   ❌ Account not found!');
}

console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
console.log('\n✅ ALICIA CRITICAL RESTORATION COMPLETE');
console.log('\n⚠️  Next: Need to restore scan data from CSV backup for both accounts');

