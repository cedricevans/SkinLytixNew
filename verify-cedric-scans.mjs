import { createClient } from '@supabase/supabase-js';

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
    
    if (data.length === 0) {
      console.log('No records found. Showing sample structure:');
      const { data: sample } = await supabase
        .from('user_analyses')
        .select()
        .limit(1);
      if (sample && sample[0]) {
        console.log('Available columns:', Object.keys(sample[0]));
      }
      process.exit(0);
    }
    
    console.log('SCAN DETAILS:');
    console.log('─'.repeat(120) + '\n');
    
    data.forEach((scan, idx) => {
      const date = scan.analysis_date ? new Date(scan.analysis_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?';
      console.log(`${String(idx + 1).padStart(2)}. ${scan.product_name || '(unknown)'}`);
      if (scan.brand) console.log(`    Brand: ${scan.brand}`);
      console.log(`    Date: ${date}`);
      console.log();
    });
    
    console.log('─'.repeat(120));
    console.log(`\n✅ TOTAL SCANS: ${data.length}`);
    
    // Check cedric's current count
    const { data: cedricData } = await supabase
      .from('user_analyses')
      .select('id')
      .eq('user_id', cedricUUID);
    
    console.log(`📊 Cedric currently has: ${cedricData ? cedricData.length : 0} scans\n`);
    
  } catch (err) {
    console.error('Exception:', err.message);
    process.exit(1);
  }
})();
