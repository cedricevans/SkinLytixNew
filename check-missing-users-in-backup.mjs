import fs from 'fs';

// The 11 users with missing scan counts
const USERS_WITH_MISSING_SCANS = [
  { email: 'jonesk.kevin@gmail.com', uuid: '7f226ed2-9623-4bca-a473-5ecf31389e2e', expected_scans: 1 },
  { email: 'whitenc@yahoo.com', uuid: 'c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be', expected_scans: 4 },
  { email: 'anita.swift89@gmail.com', uuid: 'd67f34ee-650b-4f5a-818c-86d699c5252a', expected_scans: 2 },
  { email: 'millyfiguereo@gmail.com', uuid: '625b088e-5977-4203-8d7b-27d3ca2ae27b', expected_scans: 4 },
  { email: 'taylorwhitetiff@aol.com', uuid: 'a116901f-7d76-44d2-97e0-4d140a3d7333', expected_scans: 1 },
  { email: 'chenaewyatt@yahoo.com', uuid: 'c3a94f39-6841-4b8a-8521-02185a573b8a', expected_scans: 3 },
  { email: 'kendrickg123@yahoo.com', uuid: '45d28611-5076-431e-9236-bbd5f806c414', expected_scans: 1 },
  { email: 'pte295@gmail.com', uuid: '2a492020-7e11-4bf2-a028-590b07538859', expected_scans: 3 },
  { email: 'alicia@skinlytix.com', uuid: '1e8c31de-0bc0-4dfc-8b86-22420741e849', expected_scans: 4 },
  { email: 'indigowebdesigns@gmail.com', uuid: 'cb4efe71-632f-4f0c-831e-96e9b12a708e', expected_scans: 2 },
  { email: 'csg11779@icloud.com', uuid: '8963c7a4-a1bb-4f04-8145-84654e63bc84', expected_scans: 3 }
];

console.log('🔍 Checking for missing user data in backup CSV files...\n');

// Check user_analyses
const analysesPath = 'supabase/user_analyses-export-2026-02-18_12-45-38.csv';
const analysesData = fs.readFileSync(analysesPath, 'utf-8');

const results = [];
for (const user of USERS_WITH_MISSING_SCANS) {
  const count = (analysesData.match(new RegExp(user.uuid, 'g')) || []).length;
  results.push({
    email: user.email,
    uuid: user.uuid,
    expected: user.expected_scans,
    found_in_backup: count
  });
}

results.sort((a, b) => b.found_in_backup - a.found_in_backup);

console.log('📊 SCAN DATA IN BACKUP:');
console.log('─'.repeat(90));
let total_found = 0;
for (const r of results) {
  const status = r.found_in_backup > 0 ? '✅' : '❌';
  console.log(`${status} ${r.email.padEnd(35)} | Expected: ${r.expected.toString().padEnd(2)} | Found: ${r.found_in_backup}`);
  total_found += r.found_in_backup;
}
console.log('─'.repeat(90));
console.log(`�� Total scans found: ${total_found} out of ${USERS_WITH_MISSING_SCANS.reduce((sum, u) => sum + u.expected_scans, 0)} expected\n`);

