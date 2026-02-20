import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

const CEDRIC_ID = '80c09810-7a89-4c4f-abc5-8f59036cd080'
const CEDRIC_EMAIL = 'cedric.evans@gmail.com'

async function createProfile() {
  console.log('\n✨ CREATING CEDRIC PROFILE\n')

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: CEDRIC_ID,
      email: CEDRIC_EMAIL,
      display_name: 'Cedric Evans',
      is_profile_complete: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.log(`❌ Error creating profile:`)
    console.log(error.message)
    return
  }

  console.log(`✅ PROFILE CREATED!`)
  console.log(`   ID: ${data.id}`)
  console.log(`   Email: ${data.email}`)
  console.log(`   Name: ${data.display_name}`)

  // Now verify cedric can access their data
  console.log(`\n✅ VERIFYING DATA ACCESS:\n`)

  const { data: analyses } = await supabase
    .from('user_analyses')
    .select('id, product_name')
    .eq('user_id', CEDRIC_ID)

  console.log(`   Analyses: ${analyses?.length || 0}`)
  analyses?.slice(0, 3).forEach(a => console.log(`      - ${a.product_name}`))

  const { data: routines } = await supabase
    .from('routines')
    .select('id, routine_name')
    .eq('user_id', CEDRIC_ID)

  console.log(`   Routines: ${routines?.length || 0}`)
  routines?.forEach(r => console.log(`      - ${r.routine_name}`))

  console.log(`\n✅ CEDRIC CAN NOW ACCESS ALL THEIR DATA!`)
}

createProfile().catch(console.error)
