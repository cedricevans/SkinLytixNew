#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenvConfig({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('Querying auth.users table directly from Supabase...\n');

// Query the auth.users table directly (with service role, we can access it)
const { data, error } = await supabase
  .from('auth.users')
  .select('id, email')
  .order('email');

if (error) {
  console.error('Error querying auth.users:', error);
  process.exit(1);
}

console.log(`✅ Found ${data.length} auth users total\n`);
console.log('UUID,Email');

for (const user of data) {
  console.log(`${user.id},${user.email}`);
}

// Save to file
const outputPath = path.join(__dirname, 'supabase-auth-users-full.csv');
const csv = 'UUID,Email\n' + data.map(u => `${u.id},${u.email}`).join('\n');
fs.writeFileSync(outputPath, csv);
console.log(`\n✅ Saved to ${outputPath}`);
