import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

async function diagnose() {
  console.log('\n=== CHECKING USER DATA INTEGRITY ===\n')

  // 1. Check if profiles table has correct user_ids
  console.log('1️⃣  PROFILES TABLE (user_id = auth.users.id):')
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(5)
  
  if (profilesErr) {
    console.log('❌ Error:', profilesErr.message)
  } else {
    console.log(`✅ Found ${profiles?.length || 0} profiles`)
    profiles?.forEach(p => console.log(`   - ${p.email}: ${p.id}`))
  }

  // 2. Check user_analyses table
  console.log('\n2️⃣  USER_ANALYSES TABLE (has user_id):')
  const { data: analyses, error: analysesErr } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name')
    .limit(5)
  
  if (analysesErr) {
    console.log('❌ Error:', analysesErr.message)
  } else {
    console.log(`✅ Found ${analyses?.length || 0} analyses:`)
    analyses?.forEach(a => console.log(`   - user_id: ${a.user_id.substring(0, 8)}... | ${a.product_name}`))
  }

  // 3. Check routines table
  console.log('\n3️⃣  ROUTINES TABLE (has user_id):')
  const { data: routines, error: routinesErr } = await supabase
    .from('routines')
    .select('id, user_id, routine_name')
    .limit(5)
  
  if (routinesErr) {
    console.log('❌ Error:', routinesErr.message)
  } else {
    console.log(`✅ Found ${routines?.length || 0} routines:`)
    routines?.forEach(r => console.log(`   - user_id: ${r.user_id.substring(0, 8)}... | ${r.routine_name}`))
  }

  // 4. Check for orphaned records (user_id doesn't exist in profiles)
  console.log('\n4️⃣  CHECKING FOR ORPHANED RECORDS:')
  const { data: orphaned, error: orphanedErr } = await supabase
    .rpc('check_orphaned_user_data')
  
  if (orphanedErr) {
    console.log('⚠️  Cannot check (function may not exist):', orphanedErr.message)
  } else if (orphaned) {
    console.log(`Found ${orphaned.length} orphaned records`)
    orphaned.forEach(o => console.log(`   - ${o.table}: ${o.count} records with missing user_id`))
  }

  // 5. Test RLS by trying to read as service role (should return all)
  console.log('\n5️⃣  TESTING RLS WITH SERVICE ROLE:')
  const { data: allAnalyses, count: analysisCount } = await supabase
    .from('user_analyses')
    .select('count(*)', { count: 'exact' })
  
  console.log(`   Service role can see: ${analysisCount} analyses`)

  // 6. Check profiles references
  console.log('\n6️⃣  VERIFYING PROFILES FOREIGN KEY:')
  const { data: profilesCount } = await supabase
    .from('profiles')
    .select('count(*)', { count: 'exact' })
  
  const { data: analysesCount } = await supabase
    .from('user_analyses')
    .select('count(*)', { count: 'exact' })
  
  console.log(`   Profiles: ${profilesCount}`)
  console.log(`   User analyses: ${analysesCount}`)
  
  // The issue: if analyses > profiles, some user_ids point to non-existent profiles
}

diagnose().catch(console.error)
