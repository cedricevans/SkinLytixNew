import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const { data: cedric, error: err1 } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'cedric.evans@gmail.com')
  .single();

if (err1) {
  console.log('❌ ERROR fetching cedric:', err1);
  process.exit(1);
}

console.log('👤 Cedric Profile:');
console.log(`   Email: ${cedric.email}`);
console.log(`   Display Name: ${cedric.display_name}`);
console.log(`   Tier: ${cedric.tier}`);

const { data: scans, error: err2 } = await supabase
  .from('user_analyses')
  .select('*')
  .eq('user_id', cedric.id);

if (err2) {
  console.log('❌ ERROR fetching scans:', err2);
  process.exit(1);
}

console.log(`\n📊 Cedric's Scans: ${scans.length}`);
if (scans.length === 25) {
  console.log('   ✅ All 25 scans present');
} else {
  console.log(`   ❌ Expected 25, got ${scans.length}`);
}

const { data: dupes, error: err3 } = await supabase
  .from('saved_dupes')
  .select('*')
  .eq('user_id', cedric.id);

console.log(`\n💾 Cedric's Saved Dupes: ${dupes.length || 0} (expected 5)`);
if (dupes.length === 5) console.log('   ✅ Correct');

const { data: cache, error: err4 } = await supabase
  .from('market_dupe_cache')
  .select('*')
  .eq('user_id', cedric.id);

console.log(`📈 Cedric's Dupe Cache: ${cache.length || 0} (expected 21)`);
if (cache.length === 21) console.log('   ✅ Correct');

console.log('\n✅ CEDRIC DATA VERIFICATION COMPLETE');
