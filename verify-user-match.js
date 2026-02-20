import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

async function verify() {
  // Get one analysis with full user_id
  const { data: analyses } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name')
    .limit(1)
  
  const oldUserId = analyses[0].user_id
  console.log(`\n🔍 First analysis user_id: ${oldUserId}`)
  console.log(`   Product: ${analyses[0].product_name}\n`)

  // Check if this user_id exists in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', oldUserId)
    .single()
  
  if (profile) {
    console.log(`✅ USER FOUND IN PROFILES!`)
    console.log(`   ID: ${profile.id}`)
    console.log(`   Email: ${profile.email}`)
  } else {
    console.log(`❌ USER NOT FOUND IN PROFILES`)
    console.log(`   This analysis cannot be accessed by RLS`)
  }

  // Now test: try to read as that user
  console.log(`\n🔐 TESTING RLS ACCESS:`)
  console.log(`   If user auth.uid() = ${oldUserId}`)
  console.log(`   Can they read their analysis? (This would succeed with valid RLS)`)

  // Get all analyses for this user
  const { data: userAnalyses, error } = await supabase
    .from('user_analyses')
    .select('id, product_name')
    .eq('user_id', oldUserId)
  
  if (error) {
    console.log(`   ❌ Error: ${error.message}`)
  } else {
    console.log(`   ✅ Service role found ${userAnalyses.length} analyses for this user`)
    userAnalyses.slice(0, 3).forEach(a => console.log(`      - ${a.product_name}`))
  }
}

verify().catch(console.error)
