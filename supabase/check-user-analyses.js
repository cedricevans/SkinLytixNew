#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

dotenvConfig({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

// Get all profile IDs
const { data: profiles } = await supabase.from('profiles').select('id, email');
const profileIds = new Set(profiles.map(p => p.id));
const profileMap = {};
profiles.forEach(p => profileMap[p.id] = p.email);

console.log('Profiles in database:', profileIds.size);

// Load CSV and check user_ids
const csvContent = fs.readFileSync('./supabase/user_analyses-export-2026-02-18_12-45-38.csv', 'utf-8');
const lines = csvContent.split('\n').slice(1);
const userIds = new Set();
const userIdToRecords = {};

for (const line of lines) {
  if (line.trim()) {
    const parts = line.split(';');
    if (parts.length > 1) {
      const userId = parts[1].trim();
      userIds.add(userId);
      if (!userIdToRecords[userId]) userIdToRecords[userId] = 0;
      userIdToRecords[userId]++;
    }
  }
}

console.log('Unique user_ids in CSV:', userIds.size);
console.log('Total records in CSV:', lines.filter(l => l.trim()).length);

// Find missing
const missing = Array.from(userIds).filter(id => !profileIds.has(id));
console.log('\nMissing user_ids (not in profiles):', missing.length);

if (missing.length > 0) {
  console.log('\nMissing user_ids that have records:');
  const missingSorted = missing.sort((a, b) => userIdToRecords[b] - userIdToRecords[a]);
  missingSorted.slice(0, 20).forEach(id => {
    console.log(`  - ${id}: ${userIdToRecords[id]} records`);
  });
  
  if (missing.length > 20) {
    console.log(`  ... and ${missing.length - 20} more`);
  }
}

const matchedRecords = lines.filter(line => {
  if (!line.trim()) return false;
  const userId = line.split(';')[1].trim();
  return profileIds.has(userId);
}).length;

console.log(`\nCan import: ${matchedRecords} / ${lines.filter(l => l.trim()).length} records`);
console.log(`Will skip: ${lines.filter(l => l.trim()).length - matchedRecords} records`);
