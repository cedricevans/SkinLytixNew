import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

const OLD_UUID = '85e9dd5c-b774-45a1-9d16-e0ebe82053e4'  // test_80c0@test.com (has 25 analyses)
const NEW_UUID = '80c09810-7a89-4c4f-abc5-8f59036cd080'  // cedric.evans@gmail.com

async function migrate() {
  console.log('\n🔄 MIGRATING CEDRIC DATA\n')
  
  console.log(`FROM: test_80c0@test.com (${OLD_UUID})`)
  console.log(`TO:   cedric.evans@gmail.com (${NEW_UUID})\n`)

  // 1. Find all records linked to old UUID
  console.log('1️⃣  Finding records to migrate...')
  
  const { data: analyses } = await supabase
    .from('user_analyses')
    .select('id, product_name')
    .eq('user_id', OLD_UUID)
  
  const { data: routines } = await supabase
    .from('routines')
    .select('id, routine_name')
    .eq('user_id', OLD_UUID)
  
  const { data: savedDupes } = await supabase
    .from('saved_dupes')
    .select('id')
    .eq('user_id', OLD_UUID)

  console.log(`   Found ${analyses?.length || 0} analyses`)
  console.log(`   Found ${routines?.length || 0} routines`)
  console.log(`   Found ${savedDupes?.length || 0} saved dupes`)

  // 2. Update user_analyses
  if (analyses && analyses.length > 0) {
    console.log('\n2️⃣  Updating user_analyses...')
    const { error: err1 } = await supabase
      .from('user_analyses')
      .update({ user_id: NEW_UUID })
      .eq('user_id', OLD_UUID)
    
    if (err1) {
      console.log(`   ❌ Error: ${err1.message}`)
    } else {
      console.log(`   ✅ Updated ${analyses.length} analyses`)
      analyses.slice(0, 3).forEach(a => {
        console.log(`      - ${a.product_name}`)
      })
    }
  }

  // 3. Update routines
  if (routines && routines.length > 0) {
    console.log('\n3️⃣  Updating routines...')
    const { error: err2 } = await supabase
      .from('routines')
      .update({ user_id: NEW_UUID })
      .eq('user_id', OLD_UUID)
    
    if (err2) {
      console.log(`   ❌ Error: ${err2.message}`)
    } else {
      console.log(`   ✅ Updated ${routines.length} routines`)
    }
  }

  // 4. Update saved_dupes
  if (savedDupes && savedDupes.length > 0) {
    console.log('\n4️⃣  Updating saved_dupes...')
    const { error: err3 } = await supabase
      .from('saved_dupes')
      .update({ user_id: NEW_UUID })
      .eq('user_id', OLD_UUID)
    
    if (err3) {
      console.log(`   ❌ Error: ${err3.message}`)
    } else {
      console.log(`   ✅ Updated ${savedDupes.length} saved dupes`)
    }
  }

  // 5. Verify
  console.log('\n5️⃣  Verifying migration...')
  const { data: newAnalyses, count: newCount } = await supabase
    .from('user_analyses')
    .select('id, product_name', { count: 'exact' })
    .eq('user_id', NEW_UUID)
  
  console.log(`   ✅ Cedric now has ${newCount} analyses`)
  newAnalyses?.slice(0, 3).forEach(a => {
    console.log(`      - ${a.product_name}`)
  })

  console.log('\n✅ MIGRATION COMPLETE!')
  console.log('   Log in as cedric.evans@gmail.com to see your data')
}

migrate().catch(console.error)
