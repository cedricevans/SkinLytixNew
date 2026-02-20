import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

const testUUID = '85e9dd5c-b774-45a1-9d16-e0ebe82053e4';
const cedricUUID = '80c09810-7a89-4c4f-abc5-8f59036cd080';

(async () => {
  try {
    console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║          CEDRIC\'S SCANS - VERIFICATION FOR MIGRATION                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');
    
    // Get all analyses from test account
    const { data, error } = await supabase
      .from('user_analyses')
      .select('id, product_name, brand, analysis_date')
      .eq('user_id', testUUID)
      .order('analysis_date', { ascending: false });
    
    if (error) {
      console.error('❌ Error querying:', error.message);
      process.exit(1);
    }
    
    if (data.length === 0) {
      console.error('❌ No records found under test_80c0@test.com UUID');
      process.exit(1);
    }
    
    console.log(`📋 FOUND ${data.length} SCANS UNDER test_80c0@test.com\n`);
    console.log('─'.repeat(90) + '\n');
    
    data.forEach((scan, idx) => {
      const date = new Date(scan.analysis_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: '2-digit'
      });
      console.log(`${String(idx + 1).padStart(2)}. ${scan.product_name || '(unknown)'}`);
      console.log(`    └─ Brand: ${scan.brand || '(none)'} | Date: ${date}`);
    });
    
    console.log('\n' + '─'.repeat(90));
    console.log(`\n✅ TOTAL: ${data.length} scans found\n`);
    
    // Check cedric's current count
    const { data: cedricData, error: cedricError } = await supabase
      .from('user_analyses')
      .select('id')
      .eq('user_id', cedricUUID);
    
    if (cedricError) {
      console.log('⚠️  Could not check cedric\'s current scan count');
    } else {
      console.log(`📊 Cedric (UUID: ${cedricUUID}) currently has: ${cedricData.length} scans`);
    }
    
    console.log('\n' + '═'.repeat(90));
    console.log('📌 QUESTION: Do these ${data.length} scans look like YOUR data?');
    console.log('   ✅ If YES: Ready to migrate to your account');
    console.log('   ❌ If NO: We need to find your actual scans elsewhere\n');
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
