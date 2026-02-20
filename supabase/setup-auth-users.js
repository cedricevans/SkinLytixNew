#!/usr/bin/env node

/**
 * Auth Users Import Script
 * Creates auth.users with matching UUIDs from profiles.json
 * IMPORTANT: Must be run BEFORE importing profiles table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envPath2 = path.join(__dirname, '..', '.env');
  const filesToCheck = [envPath, envPath2];
  
  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const envContent = fs.readFileSync(file, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          let value = valueParts.join('=').trim();
          value = value.replace(/^"|"$/g, '').replace(/%$/, '');
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
      break;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load profiles to get unique user IDs
function loadProfiles() {
  const filepath = path.join(__dirname, 'profiles.json');
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

async function createAuthUsers() {
  console.log('🔐 Auth Users Creation Script');
  console.log('=============================');
  console.log('⚠️  This script prepares auth user data.');
  console.log('');
  console.log('IMPORTANT: You CANNOT directly create auth.users via the API.');
  console.log('Instead, use ONE of these methods:');
  console.log('');
  console.log('Option 1: Supabase Dashboard (EASIEST)');
  console.log('---------');
  console.log('1. Go to: https://app.supabase.com');
  console.log('2. Select your project: mzprefkjpyavwbtkebqj');
  console.log('3. Go to: Authentication → Users');
  console.log('4. Click "Invite" or "Add user" button');
  console.log('5. For each profile in profiles.json, create a user with:');
  console.log('   - Email: (use email from profile)');
  console.log('   - Password: Generate a temporary password');
  console.log('6. IMPORTANT: The system will assign UUIDs. You cannot force custom UUIDs.');
  console.log('');
  console.log('Option 2: Use Supabase Admin API (If you have their endpoints)');
  console.log('---------');
  console.log('Contact Supabase support for UUID-preserving migration tools.');
  console.log('');
  console.log('Option 3: Match UUIDs After Import (WORKAROUND)');
  console.log('---------');
  console.log('1. Create auth users in the dashboard (get new UUIDs)');
  console.log('2. Update profiles.json to use the new UUIDs');
  console.log('3. Then import profiles');
  console.log('4. Then import user_analyses');
  console.log('');
  console.log('─────────────────────────────────────────');
  console.log('');

  const profiles = loadProfiles();
  const uniqueEmails = new Set();
  
  for (const profile of profiles) {
    uniqueEmails.add(profile.email);
  }

  console.log(`📊 Found ${profiles.length} profiles with ${uniqueEmails.size} unique email addresses`);
  console.log('');
  console.log('Required Auth Users:');
  console.log('');
  
  const emails = Array.from(uniqueEmails).sort();
  for (let i = 0; i < emails.length; i++) {
    console.log(`${i + 1}. ${emails[i]}`);
  }

  console.log('');
  console.log('✅ Next Steps:');
  console.log('1. Create these users in Supabase Dashboard (Authentication → Users)');
  console.log('2. Note the UUIDs assigned by Supabase');
  console.log('3. Create a mapping file with old_uuid → new_uuid');
  console.log('4. Run: node supabase/update-uuid-mapping.js <mapping-file>');
  console.log('5. Then run: node supabase/import-csv-data.js');
}

await createAuthUsers();
