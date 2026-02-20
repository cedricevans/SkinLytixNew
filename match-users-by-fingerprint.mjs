import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              MATCHING USERS BY SCAN & EVENT FINGERPRINTS                        ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

// Validation map with unique fingerprints
const VALIDATION_MAP = [
  { name: 'Adupass', email: 'alicia@xiosolutionsllc.com', uuid: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a', scans: 70, events: 811 },
  { name: 'James', email: 'james.goodnight05@gmail.com', uuid: '4d732879-4cfa-49c1-8b6a-328e707a0428', scans: 24, events: 113 },
  { name: 'Christina Branch', email: 'ct_hammonds@yahoo.com', uuid: '86b3f49a-2113-4981-9cd5-cb222ad03fe1', scans: 9, events: 81 },
  { name: 'Cedric', email: 'cedric.evans@gmail.com', uuid: '80c09810-7a89-4c4f-abc5-8f59036cd080', scans: 25, events: 1912 },
  { name: 'P Evans', email: 'pte295@gmail.com', uuid: '2a492020-7e11-4bf2-a028-590b07538859', scans: 3, events: 214 },
  { name: 'Milly Figuereo', email: 'millyfiguereo@gmail.com', uuid: '625b088e-5977-4203-8d7b-27d3ca2ae27b', scans: 4, events: 73 },
  { name: 'Ced', email: 'indigowebdesigns@gmail.com', uuid: 'cb4efe71-632f-4f0c-831e-96e9b12a708e', scans: 2, events: 70 },
  { name: 'Stacey', email: 'ssuziesuarez@gmail.com', uuid: 'bbe9a7bf-cbd3-4dce-84c7-e2a9782af92a', scans: 3, events: 45 },
  { name: 'NateParker', email: 'nate.p233@gmail.com', uuid: '80399f65-b72d-4111-8aaf-7d101d724c4a', scans: 3, events: 34 },
];

// Read CSV
const csvData = fs.readFileSync('supabase/user_analyses-export-2026-02-18_12-45-38.csv', 'utf-8');
const lines = csvData.split('\n');

console.log(`📊 CSV has ${lines.length} lines total\n`);

// Count scans per UUID in backup
const backupScans = {};
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const parts = lines[i].split(';');
  const uuid = parts[1];
  if (uuid) {
    backupScans[uuid] = (backupScans[uuid] || 0) + 1;
  }
}

console.log('🔍 MATCHING USERS BY FINGERPRINT:\n');
console.log('User'.padEnd(20) + '| Expected Scans | Found in Backup | Match?');
console.log('─'.repeat(75));

let matched = 0;
for (const user of VALIDATION_MAP) {
  const backupCount = backupScans[user.uuid] || 0;
  const match = backupCount === user.scans ? '✅' : backupCount > 0 ? '⚠️ ' : '❌';
  console.log(
    user.name.padEnd(20) + 
    `| ${user.scans.toString().padEnd(14)} | ${backupCount.toString().padEnd(14)} | ${match}`
  );
  if (backupCount === user.scans) matched++;
}

console.log('─'.repeat(75));
console.log(`\n✅ MATCHED: ${matched}/${VALIDATION_MAP.length} users by fingerprint\n`);

// Now check current database counts
console.log('🔄 CHECKING CURRENT DATABASE:\n');

for (const user of VALIDATION_MAP) {
  const { data: scans } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.uuid);
  
  const { data: events } = await supabase
    .from('user_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.uuid);
  
  const scanMatch = scans ? scans.length : 0;
  const eventMatch = events ? events.length : 0;
  
  const status = scanMatch === user.scans && Math.abs(eventMatch - user.events) < 5 ? '✅' : '❌';
  console.log(`${status} ${user.name.padEnd(20)} | Scans: ${scanMatch}/${user.scans} | Events: ${eventMatch}/${user.events}`);
}

console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
console.log('\n💡 DEDUCTION: Match users by scan/event fingerprints from backup CSV');

