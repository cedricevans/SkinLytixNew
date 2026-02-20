import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndpdGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
)

const CEDRIC_ID = '80c09810-7a89-4c4f-abc5-8f59036cd080'

async function addTestData() {
  console.log('\n✨ CREATING TEST DATA FOR CEDRIC\n')

  // Add a test analysis
  const analysis = {
    id: uuidv4(),
    user_id: CEDRIC_ID,
    product_name: 'CeraVe Facial Moisturizing Lotion',
    brand: 'CeraVe',
    category: 'Moisturizer',
    ingredients_list: 'Water, Cetyl Alcohol, Glycerin, Niacinamide',
    epiq_score: 92,
    analyzed_at: new Date().toISOString(),
    recommendations_json: {
      overall_assessment: 'Excellent moisturizer with ceramides',
      sub_scores: {
        ingredient_safety: 95,
        skin_compatibility: 90,
        active_quality: 88,
        preservative_safety: 92
      }
    },
    image_url: null
  }

  const { data, error } = await supabase
    .from('user_analyses')
    .insert(analysis)
    .select()

  if (error) {
    console.log(`❌ Error: ${error.message}`)
    return
  }

  console.log(`✅ Test analysis created!`)
  console.log(`   Product: ${analysis.product_name}`)
  console.log(`   Score: ${analysis.epiq_score}`)
  console.log(`   ID: ${analysis.id}`)

  // Verify it exists
  const { data: verify } = await supabase
    .from('user_analyses')
    .select('id, product_name, epiq_score')
    .eq('user_id', CEDRIC_ID)

  console.log(`\n✅ Verification:`)
  console.log(`   Cedric now has ${verify?.length} analyses`)
  verify?.forEach(a => {
    console.log(`   - ${a.product_name} (Score: ${a.epiq_score})`)
  })

  console.log(`\n✅ DATA READY - Try logging in again!`)
}

addTestData().catch(console.error)
