import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                      DATA MISMATCH AUDIT - ALL USERS                             ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

(async () => {
  try {
    // Get all profiles
    console.log('📋 Fetching all user profiles from database...\n');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      process.exit(1);
    }

    console.log(`Found ${profiles.length} user profiles\n`);
    console.log('UUID -> EMAIL MAPPING FROM PROFILES TABLE:');
    console.log('─'.repeat(90));
    
    const profileMap = new Map();
    profiles.forEach(p => {
      profileMap.set(p.id, p.email);
      console.log(`  ${p.id.substring(0, 8)}... → ${p.email}`);
    });

    // Get all analyses
    console.log('\n\n📊 Fetching all analyses...\n');
    const { data: analyses, error: analysesError } = await supabase
      .from('user_analyses')
      .select('user_id, product_name, brand');

    if (analysesError) {
      console.error('❌ Error fetching analyses:', analysesError.message);
      process.exit(1);
    }

    console.log(`Found ${analyses.length} total analyses\n`);

    // Group analyses by user_id
    const analysesByUser = new Map();
    analyses.forEach(a => {
      if (!analysesByUser.has(a.user_id)) {
        analysesByUser.set(a.user_id, []);
      }
      analysesByUser.get(a.user_id).push(a);
    });

    // Check for mismatches
    console.log('MISMATCH ANALYSIS:');
    console.log('─'.repeat(90) + '\n');

    let mismatchCount = 0;
    let totalAnalysesWithoutProfile = 0;

    analysesByUser.forEach((analysesForUser, userId) => {
      const email = profileMap.get(userId);
      
      if (!email) {
        totalAnalysesWithoutProfile += analysesForUser.length;
        console.log(`⚠️  UUID ${userId.substring(0, 8)}... has ${analysesForUser.length} analyses`);
        console.log(`    ❌ NO MATCHING PROFILE in database`);
        console.log(`    Sample products: ${analysesForUser.slice(0, 3).map(a => a.product_name).join(', ')}`);
        console.log();
        mismatchCount++;
      }
    });

    // Check for profiles with NO analyses
    console.log('\nPROFILES WITH NO ANALYSES:');
    console.log('─'.repeat(90) + '\n');

    let profilesWithoutAnalyses = 0;
    profileMap.forEach((email, uuid) => {
      if (!analysesByUser.has(uuid)) {
        console.log(`📭 ${email}`);
        console.log(`    UUID: ${uuid}`);
        console.log(`    ❌ Has 0 analyses`);
        console.log();
        profilesWithoutAnalyses++;
      }
    });

    // Summary
    console.log('\n' + '═'.repeat(90));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Total profiles in database: ${profiles.length}`);
    console.log(`Total analyses in database: ${analyses.length}`);
    console.log(`Profiles with no analyses: ${profilesWithoutAnalyses}`);
    console.log(`User IDs with analyses but no profile: ${mismatchCount}`);
    console.log(`Total orphaned analyses: ${totalAnalysesWithoutProfile}\n`);

    if (mismatchCount > 0 || profilesWithoutAnalyses > 0) {
      console.log('⚠️  DATA INTEGRITY ISSUE DETECTED!');
      console.log('   Some users have analyses not linked to their profile');
      console.log('   OR some profiles have no data despite users claiming they scanned products\n');
    } else {
      console.log('✅ All data is correctly linked to profiles\n');
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
