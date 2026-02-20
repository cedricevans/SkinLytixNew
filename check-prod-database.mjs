import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('🔍 CHECKING PRODUCTION DATABASE (mzprefkjpyavwbtkebqj)\n');

// Check total records
const { data: profiles, error: err1 } = await supabase
  .from('profiles')
  .select('*', { count: 'exact' });

const { data: scans, error: err2 } = await supabase
  .from('user_analyses')
  .select('*', { count: 'exact', head: true });

const { data: events, error: err3 } = await supabase
  .from('user_events')
  .select('*', { count: 'exact', head: true });

console.log(`📊 DATABASE STATUS:`);
console.log(`   Profiles: ${profiles ? profiles.length : 0} (expected: 78)`);
console.log(`   Scans: ${scans ? scans.length : 0} (expected: 201)`);
console.log(`   Events: ${events ? events.length : 0} (expected: ~3964)\n`);

// Check key users
console.log('👥 KEY USERS STATUS:\n');

const keyUsers = ['cedric.evans@gmail.com', 'alicia@xiosolutionsllc.com', 'james.goodnight05@gmail.com'];

for (const email of keyUsers) {
  const { data: user } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', email)
    .single();
  
  if (user) {
    const { data: userScans } = await supabase
      .from('user_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    console.log(`✅ ${user.display_name || email}`);
    console.log(`   UUID: ${user.id}`);
    console.log(`   Scans: ${userScans ? userScans.length : 0}\n`);
  } else {
    console.log(`❌ NOT FOUND: ${email}\n`);
  }
}

