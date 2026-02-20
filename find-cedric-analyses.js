import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

async function find() {
  const CEDRIC_ID = '80c09810-7a89-4c4f-abc5-8f59036cd080'
  const CEDRIC_EMAIL = 'cedric.evans@gmail.com'

  console.log('\n🔍 SEARCHING FOR CEDRIC\'S DATA\n')

  // 1. Get cedric's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', CEDRIC_EMAIL)

  console.log(`1️⃣  Profiles with email "${CEDRIC_EMAIL}":`)
  profile?.forEach(p => {
    console.log(`   ID: ${p.id}`)
    console.log(`   Email: ${p.email}`)
  })

  // 2. Search for any analyses with "cedric" in product name
  const { data: cedricProducts } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name, brand')
    .ilike('product_name', '%cedric%')
    .or('brand.ilike.%cedric%')

  console.log(`\n2️⃣  Analyses with 'cedric' in product/brand:`)
  if (cedricProducts && cedricProducts.length > 0) {
    cedricProducts.forEach(p => {
      console.log(`   - ${p.product_name} (user_id: ${p.user_id})`)
    })
  } else {
    console.log(`   None found`)
  }

  // 3. Get all analyses and check which user has most data
  const { data: allAnalyses } = await supabase
    .from('user_analyses')
    .select('user_id, product_name, brand')
    .limit(300)

  const userCounts = {}
  allAnalyses?.forEach(a => {
    userCounts[a.user_id] = (userCounts[a.user_id] || 0) + 1
  })

  console.log(`\n3️⃣  Users with most analyses:`)
  const sorted = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  for (const [userId, count] of sorted) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()
    
    console.log(`   ${prof?.email || 'UNKNOWN'} (${userId}): ${count} analyses`)
  }

  // 4. Check if cedric's ID has any data at all
  console.log(`\n4️⃣  Data for cedric's ID (${CEDRIC_ID}):`)
  const { data: cedricAnalyses } = await supabase
    .from('user_analyses')
    .select('product_name, brand')
    .eq('user_id', CEDRIC_ID)

  console.log(`   Analyses: ${cedricAnalyses?.length || 0}`)

  const { data: cedricRoutines } = await supabase
    .from('routines')
    .select('routine_name')
    .eq('user_id', CEDRIC_ID)

  console.log(`   Routines: ${cedricRoutines?.length || 0}`)
}

find().catch(console.error)
