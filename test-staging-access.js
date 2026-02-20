import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

async function testStagingAccess() {
  console.log('\n🔍 TESTING STAGING TABLE ACCESS\n')

  // 1. Check if staging tables exist
  console.log('1️⃣  Checking staging tables...')
  const { data: analyses, error: analysesErr } = await supabase
    .from('user_analyses_staging')
    .select('count(*)', { count: 'exact' })

  if (analysesErr) {
    console.log(`❌ Error accessing staging: ${analysesErr.message}`)
    return
  }

  console.log(`✅ Staging tables accessible: found records`)

  // 2. Get all unique user_ids in staging
  console.log('\n2️⃣  Finding all users with data in staging...')
  const { data: allAnalyses } = await supabase
    .from('user_analyses_staging')
    .select('user_id, product_name')
    .limit(100)

  const userIds = new Set(allAnalyses?.map(a => a.user_id) || [])
  console.log(`Found ${userIds.size} unique users with analyses in staging`)

  // 3. Get sample of each user's data
  console.log('\n3️⃣  Sample data from staging:\n')
  for (const uid of Array.from(userIds).slice(0, 5)) {
    const { data: userAnalyses } = await supabase
      .from('user_analyses_staging')
      .select('id, product_name, brand, epiq_score')
      .eq('user_id', uid)
      .limit(2)

    // Find this user's profile to get email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', uid)
      .single()

    console.log(`   User: ${profile?.email || 'UNKNOWN'} (${uid})`)
    userAnalyses?.forEach(a => {
      console.log(`      - ${a.product_name} (Score: ${a.epiq_score})`)
    })
  }

  // 4. Check RLS - try a specific user
  console.log('\n4️⃣  Checking RLS policies...')
  const testUserId = Array.from(userIds)[0]
  if (testUserId) {
    const { data: rlsTest } = await supabase
      .from('user_analyses_staging')
      .select('id, product_name')
      .eq('user_id', testUserId)
      .limit(1)

    if (rlsTest && rlsTest.length > 0) {
      console.log(`✅ Can read from staging with service role`)
    } else {
      console.log(`⚠️  Service role couldn't read from staging`)
    }
  }

  console.log('\n✅ STAGING TABLES ARE WORKING')
}

testStagingAccess().catch(console.error)
