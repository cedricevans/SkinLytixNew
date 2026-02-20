import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

async function find() {
  // Try without .single() 
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '80c09810-7a89-4c4f-abc5-8f59036cd080')

  console.log(`\nProfiles with that ID:`)
  console.log(JSON.stringify(profiles, null, 2))

  // Check all profiles
  const { data: all } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(5)
  
  console.log(`\nFirst 5 profiles:`)
  all?.forEach(p => console.log(`  ${p.id} | ${p.email}`))
}

find().catch(console.error)
