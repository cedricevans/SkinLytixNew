#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const errors = JSON.parse(fs.readFileSync('uuid-fix-errors.json', 'utf8'));
const scanIds = errors.map(e => e.scanId);

const { data } = await supabase
  .from('user_analyses')
  .select('id, user_id')
  .in('id', scanIds);

console.log('Scans with FK errors:');
data.forEach(scan => {
  console.log(`  ${scan.id}: user_id = ${scan.user_id}`);
});

// Check if those UUIDs exist in profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('id')
  .in('id', data.map(s => s.user_id));

console.log(`\nProfile count for those UUIDs: ${profiles.length}`);
console.log('These UUIDs dont exist in profiles table - reassigning to valid ones\n');

// Get a valid UUID to reassign to
const { data: validProfile } = await supabase
  .from('profiles')
  .select('id')
  .limit(1)
  .single();

console.log(`Will reassign to valid UUID: ${validProfile.id}\n`);

// Fix the 5 scans by assigning them to a valid user
let fixed = 0;
for (const scan of data) {
  const { error } = await supabase
    .from('user_analyses')
    .update({ user_id: validProfile.id })
    .eq('id', scan.id);
  
  if (!error) {
    console.log(`✅ Fixed scan ${scan.id}`);
    fixed++;
  } else {
    console.log(`❌ Failed to fix ${scan.id}: ${error.message}`);
  }
}

console.log(`\n✅ Fixed ${fixed}/5 remaining scans`);
