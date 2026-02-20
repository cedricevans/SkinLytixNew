const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODgwNDgsImV4cCI6MjA3MTk2NDA0OH0.c1AdKtNlfP6bqcuoQiUaCfgFAR-Xqby58RL7fPIMmb0'
);

const testUUID = '85e9dd5c-b774-45a1-9d16-e0ebe82053e4';
const cedricUUID = '80c09810-7a89-4c4f-abc5-8f59036cd080';

(async () => {
  try {
    console.log('=== CEDRIC\'S SCAN VERIFICATION ===\n');
    
    // Get all analyses from test account
    const { data, error } = await supabase
      .from('user_analyses')
      .select()
      .eq('user_id', testUUID);
    
    if (error) {
      console.error('Error querying:', error);
      process.exit(1);
    }
    
    console.log(`Total scans found under test_80c0@test.com UUID: ${data.length}\n`);
    console.log('SCAN DETAILS:');
    console.log('─'.repeat(100) + '\n');
    
    data.forEach((scan, idx) => {
      console.log(`${idx + 1}. Product: ${scan.product_name}`);
      console.log(`   Brand: ${scan.brand || '(none)'}`);
      console.log(`   Date: ${scan.date || '(unknown)'}`);
      console.log(`   ID: ${scan.id}`);
      console.log();
    });
    
    console.log('─'.repeat(100));
    console.log(`\nTOTAL: ${data.length} scans\n`);
    
    // Check cedric's current count
    const { data: cedricData, error: cedricError } = await supabase
      .from('user_analyses')
      .select('id')
      .eq('user_id', cedricUUID);
    
    if (!cedricError) {
      console.log(`Current scans linked to cedric.evans@gmail.com: ${cedricData.length}`);
    }
    
  } catch (err) {
    console.error('Exception:', err.message);
    process.exit(1);
  }
})();
