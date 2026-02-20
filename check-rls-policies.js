import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

const CEDRIC_ID = '80c09810-7a89-4c4f-abc5-8f59036cd080'

async function checkRLS() {
  console.log('\n🔐 CHECKING RLS POLICIES & DATA ACCESS\n')

  // Try different query approaches
  console.log('1️⃣  Direct count query:')
  const { count, error: err1 } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   Total records: ${count}`)
  if (err1) console.log(`   Error: ${err1.message}`)

  // Try getting all records (no filter)
  console.log('\n2️⃣  Get first 10 records (no filter):')
  const { data: allRecords, error: err2 } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name')
    .limit(10)
  
  if (err2) {
    console.log(`   ❌ Error: ${err2.message}`)
  } else {
    console.log(`   ✅ Got ${allRecords?.length} records`)
    allRecords?.slice(0, 3).forEach(r => {
      console.log(`      user_id: ${r.user_id.substring(0, 8)}... | ${r.product_name}`)
    })
  }

  // Try with cedric's ID
  console.log(`\n3️⃣  Filter by cedric's ID (${CEDRIC_ID}):`)
  const { data: cedricData, error: err3 } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name, brand, epiq_score')
    .eq('user_id', CEDRIC_ID)
  
  if (err3) {
    console.log(`   ❌ Error: ${err3.message}`)
  } else {
    console.log(`   ✅ Got ${cedricData?.length} records for cedric`)
    cedricData?.slice(0, 5).forEach(r => {
      console.log(`      - ${r.product_name} (${r.brand})`)
    })
  }

  // Check if service role has permission
  console.log(`\n4️⃣  Checking RLS bypass (service role):`)
  const { data: bypassed, error: err4 } = await supabase
    .from('user_analyses')
    .select('count(*)', { count: 'exact' })
  
  if (err4) {
    console.log(`   ❌ Even service role can't access: ${err4.message}`)
  } else {
    console.log(`   ✅ Service role can access the table`)
  }

  // Check profiles
  console.log(`\n5️⃣  Checking profiles table:`)
  const { data: profile, error: err5 } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', CEDRIC_ID)
    .single()
  
  if (err5) {
    console.log(`   ❌ Error: ${err5.message}`)
  } else {
    console.log(`   ✅ Found profile:`)
    console.log(`      Email: ${profile?.email}`)
    console.log(`      Created: ${profile?.created_at}`)
  }
}

checkRLS().catch(console.error)
