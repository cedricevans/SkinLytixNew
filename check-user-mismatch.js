import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

async function migrateUserIds() {
  console.log('\n🔄 STARTING USER_ID MIGRATION\n')

  // Step 1: Get all profiles with their auth emails
  console.log('1️⃣  Fetching all profiles and auth users...')
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, email')
  
  if (profilesErr) {
    console.error('❌ Error fetching profiles:', profilesErr)
    return
  }
  console.log(`✅ Found ${profiles.length} profiles`)

  // Step 2: Get all user_analyses records
  console.log('\n2️⃣  Fetching all user_analyses records...')
  const { data: analyses, error: analysesErr } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name')
  
  if (analysesErr) {
    console.error('❌ Error fetching analyses:', analysesErr)
    return
  }
  console.log(`✅ Found ${analyses.length} analyses to migrate`)

  // Step 3: Get all routines records
  console.log('\n3️⃣  Fetching all routines records...')
  const { data: routines, error: routinesErr } = await supabase
    .from('routines')
    .select('id, user_id, routine_name')
  
  if (routinesErr) {
    console.error('❌ Error fetching routines:', routinesErr)
    return
  }
  console.log(`✅ Found ${routines.length} routines to migrate`)

  // Step 4: Get all routine_products
  console.log('\n4️⃣  Fetching all routine_products records...')
  const { data: products, error: productsErr } = await supabase
    .from('routine_products')
    .select('id, routine_id')
  
  if (productsErr) {
    console.error('❌ Error fetching routine_products:', productsErr)
    return
  }
  console.log(`✅ Found ${products.length} routine_products to migrate`)

  // ISSUE FOUND: Old user_ids don't exist in profiles
  const oldUserIds = new Set(analyses.map(a => a.user_id))
  const profileUserIds = new Set(profiles.map(p => p.id))
  const orphanedUserIds = [...oldUserIds].filter(id => !profileUserIds.has(id))
  
  console.log('\n⚠️  ISSUE DETECTED:')
  console.log(`   - ${orphanedUserIds.length} old user_ids are NOT in profiles table`)
  console.log(`   - These ${analyses.length} analyses cannot be migrated (no matching profile)`)
  console.log('\n📋 OLD USER_IDS IN ANALYSES:')
  orphanedUserIds.slice(0, 10).forEach(id => console.log(`   - ${id}`))

  console.log('\n📋 PROFILE USER_IDS IN SYSTEM:')
  profiles.slice(0, 10).forEach(p => console.log(`   - ${p.id} (${p.email})`))

  console.log('\n❌ CANNOT MIGRATE: User data in staging tables references user_ids that no longer exist.')
  console.log('   The old users were NOT migrated to the new auth system.')
  console.log('\n✅ SOLUTION OPTIONS:')
  console.log('   1. Import old auth users into Supabase auth')
  console.log('   2. Delete staging tables and start fresh')
  console.log('   3. Create matching profiles for orphaned user_ids')
}

migrateUserIds().catch(console.error)
