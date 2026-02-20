import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The 12 users needing scans restored
const targetUUIDs = {
  'cb8048b3-a6bd-481b-8774-560dada2af59': 'Test user (2)',
  '7f226ed2-9623-4bca-a473-5ecf31389e2e': 'Kevin (1)',
  'c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be': 'Christina Whiten (4)',
  'd67f34ee-650b-4f5a-818c-86d699c5252a': 'Nee (2)',
  '625b088e-5977-4203-8d7b-27d3ca2ae27b': 'Milly Figuereo (4)',
  'a116901f-7d76-44d2-97e0-4d140a3d7333': 'Tiffany (1)',
  'c3a94f39-6841-4b8a-8521-02185a573b8a': 'Chenae (3)',
  '45d28611-5076-431e-9236-bbd5f806c414': 'Ken87 (1)',
  '2a492020-7e11-4bf2-a028-590b07538859': 'P Evans (3)',
  '1e8c31de-0bc0-4dfc-8b86-22420741e849': 'Test - Free (4)',
  'cb4efe71-632f-4f0c-831e-96e9b12a708e': 'Ced (2)',
  '8963c7a4-a1bb-4f04-8145-84654e63bc84': 'Csg11779 (3)',
};

const csvPath = path.join(__dirname, 'supabase/user_analyses-export-2026-02-18_12-45-38.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');

const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));

console.log('📋 Data from CSV for the 12 users:\n');

const uuidIndex = headers.indexOf('user_id');
const productIndex = headers.indexOf('product_name');
const timestampIndex = headers.indexOf('analyzed_at');

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(';').map(v => v.trim().replace(/^"|"$/g, ''));
  const userId = values[uuidIndex];
  
  if (targetUUIDs[userId]) {
    const product = values[productIndex];
    const timestamp = values[timestampIndex];
    console.log(`${targetUUIDs[userId]}: "${product}" (timestamp: ${timestamp})`);
  }
}

