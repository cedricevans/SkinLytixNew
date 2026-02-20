import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

// The 12 users missing scans with their expected data
const missingUsers = [
  { name: 'Test user', email: 'axdupass@yahoo.com', expectedScans: 2 },
  { name: 'Kevin', email: 'jonesk.kevin@gmail.com', expectedScans: 1 },
  { name: 'Christina Whiten', email: 'whitenc@yahoo.com', expectedScans: 4 },
  { name: 'Nee', email: 'anita.swift89@gmail.com', expectedScans: 2 },
  { name: 'Milly Figuereo', email: 'millyfiguereo@gmail.com', expectedScans: 4 },
  { name: 'Tiffany', email: 'taylorwhitetiff@aol.com', expectedScans: 1 },
  { name: 'Chenae', email: 'chenaewyatt@yahoo.com', expectedScans: 3 },
  { name: 'Ken87', email: 'kendrickg123@yahoo.com', expectedScans: 1 },
  { name: 'P Evans', email: 'pte295@gmail.com', expectedScans: 3 },
  { name: 'Test - Free', email: 'alicia@skinlytix.com', expectedScans: 4 },
  { name: 'Ced', email: 'indigowebdesigns@gmail.com', expectedScans: 2 },
  { name: 'Csg11779', email: 'csg11779@icloud.com', expectedScans: 3 },
];

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║           🔍 SCANNING 12 USERS - UUID & EMAIL FROM DATABASE                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('| # | Name | Email | UUID | Expected Scans |\n');
console.log('|---|------|-------|------|----------------|\n');

for (const user of missingUsers) {
  // Find profile by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', user.email)
    .single();
  
  if (profile) {
    console.log(`| ${missingUsers.indexOf(user) + 1} | ${user.name} | ${user.email} | ${profile.id} | ${user.expectedScans} |`);
  } else {
    console.log(`| ${missingUsers.indexOf(user) + 1} | ${user.name} | ${user.email} | NOT FOUND | ${user.expectedScans} |`);
  }
}

console.log('\n' + '='.repeat(80) + '\n');
console.log('📋 CSV FORMAT (for easy copying):\n');

for (const user of missingUsers) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', user.email)
    .single();
  
  const uuid = profile ? profile.id : 'NOT_FOUND';
  console.log(`${user.name},${user.email},${uuid},${user.expectedScans}`);
}

