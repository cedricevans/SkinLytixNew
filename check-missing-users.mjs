import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('🔍 Checking key users...\n');

// Check Adupass (Alicia)
const { data: adupass } = await supabase
  .from('profiles')
  .select('*')
  .or('email.eq.alicia@xiosolutionsllc.com,email.eq.adupass@skinlytix.com');

console.log('Adupass/Alicia profiles found:');
console.log(adupass.length > 0 ? adupass.map(p => ({ email: p.email, id: p.id })) : 'NONE');
console.log();

// Check James
const { data: james } = await supabase
  .from('profiles')
  .select('*')
  .ilike('email', '%james%');

console.log('James profiles found:');
console.log(james.length > 0 ? james.map(p => ({ email: p.email, id: p.id })) : 'NONE');
console.log();

// Check Cedric
const { data: cedric } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'cedric.evans@gmail.com');

console.log('Cedric profile:');
console.log(cedric.length > 0 ? { email: cedric[0].email, id: cedric[0].id, scans: await getScanCount(cedric[0].id) } : 'NOT FOUND');

async function getScanCount(userId) {
  const { count } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count;
}

