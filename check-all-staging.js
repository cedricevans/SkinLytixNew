import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

async function checkAll() {
  console.log('\n📊 CHECKING ALL STAGING DATA\n')

  // Count records in staging
  const { data: analyses, count: analysisCount } = await supabase
    .from('user_analyses_staging')
    .select('*', { count: 'exact' })
    .limit(1)

  const { data: routines, count: routineCount } = await supabase
    .from('routines_staging')
    .select('*', { count: 'exact' })
    .limit(1)

  const { data: products, count: productCount } = await supabase
    .from('routine_products_staging')
    .select('*', { count: 'exact' })
    .limit(1)

  console.log(`user_analyses_staging: ${analysisCount} records`)
  console.log(`routines_staging: ${routineCount} records`)
  console.log(`routine_products_staging: ${productCount} records`)

  // If there IS data, show sample
  if (analysisCount > 0) {
    console.log('\n✅ STAGING DATA EXISTS!')
    console.log('\nSample analyses:')
    const { data: sample } = await supabase
      .from('user_analyses_staging')
      .select('user_id, product_name, brand')
      .limit(5)

    const users = new Set(sample?.map(s => s.user_id) || [])
    console.log(`   Found data for ${users.size} users`)
    sample?.slice(0, 3).forEach(s => {
      console.log(`   - ${s.product_name} (${s.brand})`)
    })
  } else {
    console.log('\n❌ NO DATA IN STAGING TABLES')
    console.log('   Staging tables are empty!')
  }

  // Check production tables
  console.log('\n📊 CHECKING PRODUCTION TABLES\n')
  
  const { count: prodAnalysisCount } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact' })
    .limit(1)

  const { count: prodRoutineCount } = await supabase
    .from('routines')
    .select('*', { count: 'exact' })
    .limit(1)

  console.log(`user_analyses: ${prodAnalysisCount} records`)
  console.log(`routines: ${prodRoutineCount} records`)

  if (prodAnalysisCount > 0) {
    console.log('\n✅ Production has data - app should use production tables instead')
  }
}

checkAll().catch(console.error)
