import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

// All user IDs we know about
const allUsers = [
  { name: 'Adupass', id: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a' },
  { name: 'James (Goodnight)', id: '4d732879-4cfa-49c1-8b6a-328e707a0428' },
  { name: 'James (Cowart)', id: '181cb709-a11b-411e-acbb-5e32a33c31c7' },
  { name: 'Cedric', id: '80c09810-7a89-4c4f-abc5-8f59036cd080' },
];

console.log('🔍 Searching for all scans:\n');

let totalScans = 0;
for (const user of allUsers) {
  const { count } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  
  console.log(`${user.name}: ${count} scans`);
  totalScans += count;
}

console.log(`\nTotal: ${totalScans} scans\n`);
console.log('Missing: 28 scans (201 - 173 = 28)');
console.log('Expected James: 24 scans');
console.log('Missing from James: 24 scans\n');

// Get all unique user_ids in user_analyses
const { data: allAnalyses } = await supabase
  .from('user_analyses')
  .select('user_id');

const uniqueUsers = [...new Set(allAnalyses.map(a => a.user_id))];
console.log(`\n📊 All user IDs with scans in database (${uniqueUsers.length} total):`);
console.log(uniqueUsers.join('\n'));

