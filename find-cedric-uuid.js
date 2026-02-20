import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

async function find() {
  console.log('\n🔍 FINDING CEDRIC UUID IN ANALYSES\n')

  // Get all analyses to find user_ids and match with products
  const { data: all } = await supabase
    .from('user_analyses')
    .select('user_id, product_name, brand')
    .limit(300)

  // Look for cedric-related products
  const cedricRecords = all.filter(a => {
    const name = `${a.product_name} ${a.brand}`.toLowerCase()
    return name.includes('cedric') || name.includes('evans') || name.includes('skincare routine')
  })

  console.log(`Found ${cedricRecords.length} potential cedric records`)

  // Get user_id counts to find user with 25 records
  const userCounts = {}
  all.forEach(a => {
    userCounts[a.user_id] = (userCounts[a.user_id] || 0) + 1
  })

  // Sort by count
  const sorted = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])

  console.log(`\nUsers by analysis count:`)
  for (const [uid, count] of sorted.slice(0, 10)) {
    // Get the email for this user_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', uid)
      .single()

    console.log(`   ${count.toString().padStart(3)} | ${profile?.email || 'NO PROFILE'} | ${uid}`)

    // If this looks like cedric (25+ records), show samples
    if (count >= 25) {
      const samples = all.filter(a => a.user_id === uid).slice(0, 3)
      samples.forEach(s => {
        console.log(`        • ${s.product_name}`)
      })
    }
  }
}

find().catch(console.error)
