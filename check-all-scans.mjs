import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

const userIds = [
  { name: 'Adupass (Admin)', id: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a' },
  { name: 'Adupass (Duplicate)', id: 'c4290c36-e068-4659-b42b-f62cdc8e4f0a' },
  { name: 'James (Goodnight)', id: '4d732879-4cfa-49c1-8b6a-328e707a0428' },
  { name: 'James (Cowart)', id: '181cb709-a11b-411e-acbb-5e32a33c31c7' },
  { name: 'Cedric Evans', id: '80c09810-7a89-4c4f-abc5-8f59036cd080' },
];

console.log('📊 Scan Count by User:\n');

for (const user of userIds) {
  const { count } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  
  console.log(`${user.name}: ${count} scans`);
}

console.log('\n' + '='.repeat(60));
const { count: total } = await supabase
  .from('user_analyses')
  .select('*', { count: 'exact', head: true });

console.log(`\nTOTAL SCANS: ${total}`);

