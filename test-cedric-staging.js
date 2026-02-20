import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODgwNDgsImV4cCI6MjA3MTk2NDA0OH0.c1AdKtNlfP6bqcuoQiUaCfgFAR-Xqby58RL7fPIMmb0'
)

async function testUser() {
  console.log('\n🔐 TESTING CEDRIC.EVANS LOGIN\n')

  // 1. Login as user
  console.log('1️⃣  Logging in...')
  const { data: { user }, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'cedric.evans@gmail.com',
    password: 'Evans123@E'
  })

  if (loginErr) {
    console.log(`❌ Login failed: ${loginErr.message}`)
    return
  }

  console.log(`✅ Logged in as: ${user.email}`)
  console.log(`   User ID: ${user.id}`)

  // 2. Check profile
  console.log('\n2️⃣  Checking profile...')
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile) {
    console.log(`✅ Profile exists`)
    console.log(`   Display name: ${profile.display_name}`)
    console.log(`   Is complete: ${profile.is_profile_complete}`)
  } else {
    console.log(`❌ No profile found for this user`)
  }

  // 3. Check analyses in staging
  console.log('\n3️⃣  Checking analyses in staging...')
  const { data: analyses, error: analysesErr } = await supabase
    .from('user_analyses_staging')
    .select('id, product_name, brand, epiq_score, analyzed_at')
    .eq('user_id', user.id)

  if (analysesErr) {
    console.log(`❌ Error querying staging: ${analysesErr.message}`)
  } else {
    console.log(`✅ Found ${analyses?.length || 0} analyses`)
    analyses?.slice(0, 3).forEach(a => {
      console.log(`   - ${a.product_name} (${a.brand}) - Score: ${a.epiq_score}`)
    })
  }

  // 4. Check routines in staging
  console.log('\n4️⃣  Checking routines in staging...')
  const { data: routines } = await supabase
    .from('routines_staging')
    .select('id, routine_name')
    .eq('user_id', user.id)

  console.log(`✅ Found ${routines?.length || 0} routines`)
  routines?.forEach(r => {
    console.log(`   - ${r.routine_name}`)
  })

  // 5. Check what's in production (old tables)
  console.log('\n5️⃣  Checking production tables...')
  const { data: prodAnalyses } = await supabase
    .from('user_analyses')
    .select('id, product_name')
    .eq('user_id', user.id)

  const { data: prodRoutines } = await supabase
    .from('routines')
    .select('id, routine_name')
    .eq('user_id', user.id)

  console.log(`   Production analyses: ${prodAnalyses?.length || 0}`)
  console.log(`   Production routines: ${prodRoutines?.length || 0}`)

  console.log('\n' + '='.repeat(50))
  if ((analyses?.length || 0) > 0) {
    console.log('✅ DATA FOUND IN STAGING - User should see it!')
  } else {
    console.log('❌ NO DATA IN STAGING - This user might not have old data')
  }
}

testUser().catch(console.error)
