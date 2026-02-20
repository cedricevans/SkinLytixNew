import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

const CEDRIC_EMAIL = 'cedric.evans@gmail.com'
const CEDRIC_ID = '80c09810-7a89-4c4f-abc5-8f59036cd080'

async function search() {
  console.log('\n🔍 WHERE IS CEDRIC DATA?\n')

  // Check production
  console.log('1️⃣  PRODUCTION user_analyses:')
  const { data: prod, count: prodCount } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name', { count: 'exact' })
    .eq('user_id', CEDRIC_ID)
  console.log(`   ${prodCount} records for cedric`)
  
  // Check staging
  console.log('\n2️⃣  STAGING user_analyses_staging:')
  const { data: stag, count: stagCount } = await supabase
    .from('user_analyses_staging')
    .select('id, user_id, product_name', { count: 'exact' })
    .eq('user_id', CEDRIC_ID)
  console.log(`   ${stagCount} records for cedric`)

  // Check all users in production
  console.log('\n3️⃣  Total records in PRODUCTION:')
  const { count: totalProd } = await supabase
    .from('user_analyses')
    .select('count(*)', { count: 'exact' })
  console.log(`   ${totalProd} total records`)

  // Check all users in staging
  console.log('\n4️⃣  Total records in STAGING:')
  const { count: totalStag } = await supabase
    .from('user_analyses_staging')
    .select('count(*)', { count: 'exact' })
  console.log(`   ${totalStag} total records`)

  // Check if cedric has analyses under different ID
  console.log('\n5️⃣  Checking all profiles for email variants:')
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(100)

  const cedricProfiles = (allProfiles || []).filter(p => p.email.includes('cedric'))
  console.log(`   Found ${cedricProfiles.length} profiles with "cedric" in email:`)
  
  for (const prof of cedricProfiles) {
    const { count: c1 } = await supabase
      .from('user_analyses')
      .select('count(*)', { count: 'exact' })
      .eq('user_id', prof.id)
    
    const { count: c2 } = await supabase
      .from('user_analyses_staging')
      .select('count(*)', { count: 'exact' })
      .eq('user_id', prof.id)
    
    console.log(`      ${prof.email}: ${c1} prod + ${c2} staging`)
  }

  // Find who has the 75 analyses
  console.log('\n6️⃣  Users with most analyses:')
  const { data: allAnalyses } = await supabase
    .from('user_analyses')
    .select('user_id')
    .limit(500)

  const counts = {}
  allAnalyses?.forEach(a => {
    counts[a.user_id] = (counts[a.user_id] || 0) + 1
  })

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  for (const [uid, cnt] of sorted) {
    const { data: p } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', uid)
      .single()
    
    console.log(`      ${p?.email || 'UNKNOWN'}: ${cnt}`)
  }
}

search().catch(console.error)
