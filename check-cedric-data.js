import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

const CEDRIC_ID = '80c09810-7a89-4c4f-abc5-8f59036cd080'

async function check() {
  console.log('\n📊 CEDRIC DATA INVENTORY\n')

  // Check analyses
  const { data: analyses, count: analysisCount } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact' })
    .eq('user_id', CEDRIC_ID)

  console.log(`✅ Analyses: ${analysisCount}`)
  if (analyses && analyses.length > 0) {
    analyses.slice(0, 3).forEach(a => {
      console.log(`   - ID: ${a.id}`)
      console.log(`     Product: ${a.product_name}`)
      console.log(`     Score: ${a.epiq_score}`)
    })
  } else {
    console.log(`   (none found)`)
  }

  // Check routines
  const { data: routines, count: routineCount } = await supabase
    .from('routines')
    .select('*', { count: 'exact' })
    .eq('user_id', CEDRIC_ID)

  console.log(`\n✅ Routines: ${routineCount}`)
  if (routines && routines.length > 0) {
    routines.forEach(r => {
      console.log(`   - ID: ${r.id}`)
      console.log(`     Name: ${r.routine_name}`)
    })
  } else {
    console.log(`   (none found)`)
  }

  // Check if problem is RLS by checking with auth client
  console.log(`\n⚠️  THE PROBLEM:`)
  console.log(`   Cedric's profile EXISTS ✅`)
  console.log(`   But the app CANNOT see the data 😞`)
  console.log(`   \n💡 POSSIBLE CAUSES:`)
  console.log(`   1. RLS policy is blocking access`)
  console.log(`   2. Data was migrated with different user_id`)
  console.log(`   3. Auth session issue (JWT token mismatch)`)
}

check().catch(console.error)
