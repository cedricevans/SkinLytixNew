import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

const ADUPASS_CORRECT_UUID = '4efb5df3-ce0a-40f6-ae13-6defa1610d3a';
const ADUPASS_WRONG_UUID = 'c4290c36-e068-4659-b42b-f62cdc8e4f0a';

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              🔧 FIXING: Moving Adupass scans to correct UUID                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

console.log(`Moving 70 scans from: ${ADUPASS_WRONG_UUID}`);
console.log(`                 to: ${ADUPASS_CORRECT_UUID}\n`);

// Update all scans for Adupass to the correct UUID
const { error } = await supabase
  .from('user_analyses')
  .update({ user_id: ADUPASS_CORRECT_UUID })
  .eq('user_id', ADUPASS_WRONG_UUID);

if (error) {
  console.log(`❌ Error updating scans: ${error.message}`);
} else {
  console.log('✅ All 70 Adupass scans moved to correct UUID\n');
}

// Update all events for Adupass to the correct UUID
const { error: eventsError } = await supabase
  .from('user_events')
  .update({ user_id: ADUPASS_CORRECT_UUID })
  .eq('user_id', ADUPASS_WRONG_UUID);

if (eventsError) {
  console.log(`❌ Error updating events: ${eventsError.message}`);
} else {
  console.log('✅ All Adupass events moved to correct UUID\n');
}

// Now delete the duplicate/wrong profile
console.log('Deleting duplicate profile...\n');
const { error: deleteError } = await supabase
  .from('profiles')
  .delete()
  .eq('id', ADUPASS_WRONG_UUID);

if (deleteError) {
  console.log(`❌ Error deleting duplicate profile: ${deleteError.message}`);
} else {
  console.log('✅ Duplicate profile deleted\n');
}

// Verify
const { count: correctCount } = await supabase
  .from('user_analyses')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', ADUPASS_CORRECT_UUID);

const { count: wrongCount } = await supabase
  .from('user_analyses')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', ADUPASS_WRONG_UUID);

console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
console.log('✅ VERIFICATION:\n');
console.log(`Correct UUID (${ADUPASS_CORRECT_UUID}): ${correctCount} scans (expected: 70)`);
console.log(`Wrong UUID (${ADUPASS_WRONG_UUID}): ${wrongCount} scans (expected: 0)\n`);

if (correctCount === 70 && wrongCount === 0) {
  console.log('🎉 SUCCESS! Adupass data fixed!\n');
} else {
  console.log('⚠️  Data may not be correct - please verify\n');
}

