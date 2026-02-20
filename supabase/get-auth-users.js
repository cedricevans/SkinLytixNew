#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local from project root
const envPath = path.join(__dirname, '..', '.env.local');
dotenvConfig({ path: envPath });

console.log('Loading environment from:', envPath);
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✓ loaded' : '✗ MISSING');
console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? '✓ loaded' : '✗ MISSING');

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ ERROR: Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

try {
  console.log('\nQuerying Supabase for auth users (with pagination)...');
  
  let allUsers = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;
  
  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      perPage: pageSize,
      page: page
    });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      process.exit(1);
    }
    
    if (users && users.length > 0) {
      allUsers = allUsers.concat(users);
      console.log(`  Page ${page}: ${users.length} users`);
      page++;
      hasMore = users.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`\n✅ Found ${allUsers.length} total auth users in Supabase\n`);
  console.log('UUID,Email');
  
  const sorted = allUsers.sort((a, b) => a.email.localeCompare(b.email));
  for (const user of sorted) {
    console.log(`${user.id},${user.email}`);
  }
  
  // Save to file in supabase directory
  const outputPath = path.join(__dirname, 'supabase-auth-users.csv');
  const csv = 'UUID,Email\n' + sorted.map(u => `${u.id},${u.email}`).join('\n');
  fs.writeFileSync(outputPath, csv);
  console.log(`\n✅ Saved auth users to ${outputPath}`);
  
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
