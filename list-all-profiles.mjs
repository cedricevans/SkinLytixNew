import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('📋 FETCHING ALL PROFILES FROM DATABASE...\n');

(async () => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, subscription_tier, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Total profiles in database: ${profiles.length}\n`);
    console.log('| # | UUID | Email | Display Name | Tier | Created |');
    console.log('|---|------|-------|-------------|------|---------|');

    profiles.forEach((p, idx) => {
      const created = new Date(p.created_at).toISOString().split('T')[0];
      const uuid = `\`${p.id}\``;
      console.log(`| ${idx + 1} | ${uuid} | ${p.email} | ${p.display_name || 'N/A'} | ${p.subscription_tier || 'free'} | ${created} |`);
    });

    console.log('\n\n📊 ANALYSIS:\n');

    // Get analyses count
    const { data: analyses } = await supabase
      .from('user_analyses')
      .select('user_id');

    const byUser = {};
    analyses.forEach(a => {
      byUser[a.user_id] = (byUser[a.user_id] || 0) + 1;
    });

    console.log(`Total profiles: ${profiles.length}`);
    console.log(`Total analyses: ${analyses.length}`);
    console.log(`Users with analyses: ${Object.keys(byUser).length}`);
    console.log(`Users with 0 analyses: ${profiles.length - Object.keys(byUser).length}\n`);

    // Find cedric
    const cedric = profiles.find(p => p.email === 'cedric.evans@gmail.com');
    if (cedric) {
      const cedricCount = byUser[cedric.id] || 0;
      console.log(`\n🎯 CEDRIC STATUS:`);
      console.log(`   Email: ${cedric.email}`);
      console.log(`   UUID: ${cedric.id}`);
      console.log(`   Analyses: ${cedricCount}`);
      console.log(`   Created: ${new Date(cedric.created_at).toISOString()}`);
    } else {
      console.log('\n❌ CEDRIC NOT FOUND IN PROFILES');
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
