#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read profiles.json
const profilesPath = path.join(__dirname, 'profiles.json');
const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));

// Read Supabase auth users CSV
const authUsersPath = path.join(__dirname, 'supabase-auth-users.csv');
const authUsersCSV = fs.readFileSync(authUsersPath, 'utf-8');
const authUsers = {};

authUsersCSV.split('\n').slice(1).forEach(line => {
  if (line.trim()) {
    const [uuid, email] = line.trim().split(',');
    if (uuid && email) {
      authUsers[email.toLowerCase()] = uuid;
    }
  }
});

console.log(`\n📊 UUID Mapping Analysis\n`);
console.log(`Profiles to import: ${profiles.length}`);
console.log(`Auth users in Supabase: ${Object.keys(authUsers).length}\n`);

// Create mapping and identify missing users
const mapping = {};
const missingEmails = [];

for (const profile of profiles) {
  const email = profile.email.toLowerCase();
  if (authUsers[email]) {
    mapping[profile.id] = authUsers[email];
  } else {
    missingEmails.push(profile.email);
  }
}

console.log(`✅ Matched profiles: ${Object.keys(mapping).length}`);
console.log(`❌ Missing auth users: ${missingEmails.length}\n`);

if (missingEmails.length > 0) {
  console.log('❌ These profiles have no matching auth user:');
  missingEmails.forEach(email => console.log(`   - ${email}`));
  console.log();
}

// Save mapping
const mappingPath = path.join(__dirname, 'uuid-mapping.json');
const mappingData = {
  created_at: new Date().toISOString(),
  profiles_total: profiles.length,
  auth_users_found: Object.keys(mapping).length,
  missing_count: missingEmails.length,
  mapping: mapping
};

fs.writeFileSync(mappingPath, JSON.stringify(mappingData, null, 2));
console.log(`✅ Saved UUID mapping to ${mappingPath}`);

// Create updated profiles.json with correct UUIDs
const updatedProfiles = profiles.map(profile => {
  const email = profile.email.toLowerCase();
  if (authUsers[email]) {
    return {
      ...profile,
      id: authUsers[email] // Use Supabase's UUID instead of original
    };
  }
  return profile;
});

const updatedProfilesPath = path.join(__dirname, 'profiles-updated.json');
fs.writeFileSync(updatedProfilesPath, JSON.stringify(updatedProfiles, null, 2));
console.log(`✅ Created updated profiles with Supabase UUIDs: ${updatedProfilesPath}`);

console.log(`\n📝 Summary:`);
console.log(`  - Ready to import: ${Object.keys(mapping).length} profiles`);
if (missingEmails.length > 0) {
  console.log(`  - Cannot import: ${missingEmails.length} profiles (auth users missing)`);
}
console.log(`\nNext: Use 'profiles-updated.json' for import\n`);
