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

// Read profiles.json to get required emails
const profiles = JSON.parse(fs.readFileSync(path.join(__dirname, 'profiles.json'), 'utf-8'));
const requiredEmails = new Set(profiles.map(p => p.email.toLowerCase()));

// Get existing auth users
const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

// Find missing emails
const missingEmails = Array.from(requiredEmails).filter(email => !existingEmails.has(email));

console.log(`\n👤 Auth User Status\n`);
console.log(`Profiles requiring auth users: ${requiredEmails.size}`);
console.log(`Existing auth users: ${existingUsers.length}`);
console.log(`Missing auth users: ${missingEmails.length}\n`);

if (missingEmails.length === 0) {
  console.log('✅ All required auth users already exist! Ready to import profiles.\n');
  process.exit(0);
}

console.log(`Creating ${missingEmails.length} missing auth users...\n`);

let created = 0;
let failed = 0;
const errors = [];

// Create missing auth users with a strong temporary password
for (const email of missingEmails) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: `Temp${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}!`, // Strong random password
      email_confirm: true
    });

    if (error) {
      console.log(`❌ ${email}: ${error.message}`);
      failed++;
      errors.push({ email, error: error.message });
    } else {
      console.log(`✅ Created: ${email} (UUID: ${data.user.id})`);
      created++;
    }
  } catch (err) {
    console.log(`❌ ${email}: ${err.message}`);
    failed++;
    errors.push({ email, error: err.message });
  }
}

console.log(`\n📊 Results`);
console.log(`Created: ${created}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log(`\n❌ Errors:`);
  errors.forEach(e => console.log(`  - ${e.email}: ${e.error}`));
}

console.log('\n✅ Auth users setup complete. Ready to import profiles.\n');
