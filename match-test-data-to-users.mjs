import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║        MATCHING ORPHANED TEST DATA TO REAL USERS BY PATTERNS                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

const orphanedTestEmails = [
  'beta-test-1757619142857@example.com',
  'beta-test-1758659296143@example.com',
  'test.user@skinlytix.dev',
  'test_nov24@test.com',
  'test_d67f@test.com',
  'test_625b@test.com',
  'test_1216@test.com',
  'test_45d2@test.com',
  'test_80c0@test.com',
  'test_8902@test.com',
  'test_2a49@test.com',
  'test_6413@test.com',
  'test_b9eb@test.com',
  'test_cb4e@test.com',
  'test_a116@test.com',
  'test_c3a9@test.com',
  'test_7f22@test.com',
  'test_8963@test.com'
];

(async () => {
  try {
    // Get all profiles
    const { data: allProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email');

    if (profileError || !allProfiles) {
      console.error('Error fetching profiles:', profileError?.message);
      process.exit(1);
    }

    // Get all analyses with details
    const { data: allAnalyses, error: analysisError } = await supabase
      .from('user_analyses')
      .select('*');

    if (analysisError || !allAnalyses) {
      console.error('Error fetching analyses:', analysisError?.message);
      process.exit(1);
    }

    // Separate real users from test accounts
    const realProfiles = allProfiles.filter(p => !orphanedTestEmails.includes(p.email));
    const testProfiles = allProfiles.filter(p => orphanedTestEmails.includes(p.email));

    console.log(`📊 ANALYZING ${testProfiles.length} TEST ACCOUNTS:\n`);
    console.log('─'.repeat(90) + '\n');

    // For each test account, extract data patterns
    const analysisMap = new Map();
    allAnalyses.forEach(a => {
      if (!analysisMap.has(a.user_id)) {
        analysisMap.set(a.user_id, []);
      }
      analysisMap.get(a.user_id).push(a);
    });

    // Analyze each test account's data
    const testDataPatterns = [];

    for (const testProfile of testProfiles) {
      const testData = analysisMap.get(testProfile.id) || [];
      
      if (testData.length === 0) {
        console.log(`⚪ ${testProfile.email} - NO DATA (empty test account)`);
        continue;
      }

      // Extract patterns from test data
      const brands = [...new Set(testData.map(d => d.brand).filter(b => b))];
      const products = testData.map(d => d.product_name).slice(0, 3);
      const dateRange = testData.length > 0 ? {
        earliest: testData[testData.length - 1].created_at,
        latest: testData[0].created_at
      } : null;

      console.log(`🔍 ${testProfile.email}`);
      console.log(`   Scans: ${testData.length}`);
      console.log(`   Brands: ${brands.join(', ')}`);
      console.log(`   Products (sample): ${products.slice(0, 2).join(', ')}`);
      if (dateRange) {
        console.log(`   Date range: ${dateRange.earliest} - ${dateRange.latest}`);
      }

      testDataPatterns.push({
        testId: testProfile.id,
        testEmail: testProfile.email,
        scanCount: testData.length,
        brands: brands,
        products: products,
        dateRange: dateRange,
        data: testData
      });

      console.log();
    }

    // Try to match test data to real users
    console.log('\n' + '─'.repeat(90));
    console.log('\n🔗 ATTEMPTING MATCHES:\n');

    const potentialMatches = [];

    for (const testPattern of testDataPatterns) {
      if (testPattern.scanCount === 0) continue;

      console.log(`Matching: ${testPattern.testEmail} (${testPattern.scanCount} scans)`);

      // Try to find real users with similar characteristics
      for (const realProfile of realProfiles) {
        const realData = analysisMap.get(realProfile.id) || [];
        
        // Check for email name patterns
        const testNameParts = testPattern.testEmail
          .replace(/test_?/, '')
          .replace(/@.*/, '')
          .split(/[_\-.]/)
          .filter(x => x.length > 0 && !x.match(/\d{10,}/));
        
        const realNameParts = realProfile.email
          .replace(/@.*/, '')
          .split(/[_\-.]/)
          .filter(x => x.length > 0);

        const nameMatch = testNameParts.some(t => realNameParts.some(r => 
          t === r && t.length > 2
        ));

        // Check for brand overlap (if both have data)
        const realBrands = realData.length > 0 ? [...new Set(realData.map(d => d.brand).filter(b => b))] : [];
        const brandOverlap = testPattern.brands.filter(b => realBrands.includes(b)).length;

        if (nameMatch || (brandOverlap > 0 && realData.length === 0)) {
          console.log(`   ✅ POSSIBLE MATCH: ${realProfile.email}`);
          if (nameMatch) console.log(`      - Email name match`);
          if (brandOverlap > 0) console.log(`      - ${brandOverlap} brand(s) in common`);
          
          potentialMatches.push({
            testId: testPattern.testId,
            testEmail: testPattern.testEmail,
            realId: realProfile.id,
            realEmail: realProfile.email,
            testScans: testPattern.scanCount,
            realScans: realData.length,
            confidence: nameMatch ? 'HIGH' : 'MEDIUM',
            reason: nameMatch ? 'email_name' : 'brand_overlap'
          });
        }
      }

      console.log();
    }

    // Summary
    console.log('─'.repeat(90));
    console.log('\n📋 SUMMARY:\n');
    console.log(`Test accounts analyzed: ${testDataPatterns.length}`);
    console.log(`Potential matches found: ${potentialMatches.length}\n`);

    if (potentialMatches.length > 0) {
      console.log('HIGH CONFIDENCE MATCHES:\n');
      potentialMatches.filter(m => m.confidence === 'HIGH').forEach(m => {
        console.log(`  ${m.testEmail} (${m.testScans} scans) → ${m.realEmail}`);
      });

      console.log('\nMEDIUM CONFIDENCE MATCHES:\n');
      potentialMatches.filter(m => m.confidence === 'MEDIUM').forEach(m => {
        console.log(`  ${m.testEmail} (${m.testScans} scans) → ${m.realEmail}`);
      });
    }

    // Save matches for next migration step
    console.log('\n' + '═'.repeat(90));
    console.log('\n✅ Ready to migrate matched data if confirmed.\n');

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
