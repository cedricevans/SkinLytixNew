import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

const CEDRIC_ID = '80c09810-7a89-4c4f-abc5-8f59036cd080'
const CEDRIC_EMAIL = 'cedric.evans@gmail.com'

async function check() {
  console.log('\n🔍 CHECKING CEDRIC.EVANS ACCOUNT\n')

  // 1. Check if profile exists
  console.log('1️⃣  Looking for profile with this ID...')
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', CEDRIC_ID)
    .single()

  if (profile) {
    console.log(`✅ PROFILE FOUND!`)
    console.log(`   ID: ${profile.id}`)
    console.log(`   Email: ${profile.email}`)
  } else {
    console.log(`❌ PROFILE NOT FOUND`)
    console.log(`   This is why cedric can't see their data!`)
  }

  // 2. Check if cedric has any analyses
  console.log('\n2️⃣  Checking for analyses...')
  const { data: analyses } = await supabase
    .from('user_analyses')
    .select('id, product_name')
    .eq('user_id', CEDRIC_ID)
  
  console.log(`Found ${analyses?.length || 0} analyses for cedric`)
  analyses?.slice(0, 3).forEach(a => console.log(`   - ${a.product_name}`))

  // 3. Check if cedric has routines
  console.log('\n3️⃣  Checking for routines...')
  const { data: routines } = await supabase
    .from('routines')
    .select('id, routine_name')
    .eq('user_id', CEDRIC_ID)
  
  console.log(`Found ${routines?.length || 0} routines for cedric`)
  routines?.forEach(r => console.log(`   - ${r.routine_name}`))

  // 4. Check if email exists in other profiles
  console.log('\n4️⃣  Looking for this email in profiles...')
  const { data: emailProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', CEDRIC_EMAIL)
    .single()
  
  if (emailProfile) {
    console.log(`⚠️  EMAIL FOUND WITH DIFFERENT ID!`)
    console.log(`   Old ID: ${emailProfile.id}`)
    console.log(`   Email: ${emailProfile.email}`)
    console.log(`   This is the mismatch!`)
  } else {
    console.log(`Email not in profiles`)
  }
}

check().catch(console.error)
