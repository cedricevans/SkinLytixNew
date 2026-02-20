import { readFileSync } from 'fs';

const csvPath = 'supabase/user_analyses-export-2026-02-18_12-45-38.csv';
const csvContent = readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');

console.log(`
╔════════════════════════════════════════════════════════════╗
║     ANALYZE CSV DATA QUALITY                               ║
╚════════════════════════════════════════════════════════════╝
`);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Parse all rows
const validRows = [];
const invalidRows = [];

lines.slice(1).forEach((line, idx) => {
  const [scanId, userId, ...rest] = line.split(';');
  
  const isValidScanId = uuidRegex.test(scanId);
  const isValidUserId = uuidRegex.test(userId);
  
  if (isValidScanId && isValidUserId) {
    validRows.push({ scanId, userId, lineNum: idx + 2 });
  } else {
    invalidRows.push({ 
      scanId, 
      userId, 
      lineNum: idx + 2,
      scanIdValid: isValidScanId,
      userIdValid: isValidUserId
    });
  }
});

console.log(`\n📊 CSV Data Quality Analysis:\n`);
console.log(`  Total rows: ${lines.length - 1}`);
console.log(`  Valid UUID pairs: ${validRows.length}`);
console.log(`  Invalid rows: ${invalidRows.length}`);

console.log(`\n🔴 First 20 invalid rows:\n`);
invalidRows.slice(0, 20).forEach(row => {
  console.log(`  Line ${row.lineNum}: scanId=${row.scanId} (${row.scanIdValid ? '✅' : '❌'}), userId=${row.userId} (${row.userIdValid ? '✅' : '❌'})`);
});

// Count unique valid user IDs
const uniqueValidUsers = new Set(validRows.map(r => r.userId));
console.log(`\n📈 Summary:\n`);
console.log(`  Valid scan rows: ${validRows.length}`);
console.log(`  Unique valid users in valid rows: ${uniqueValidUsers.size}`);

