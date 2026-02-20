import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const ADUPASS_UUID = '4efb5df3-ce0a-40f6-ae13-6defa1610d3a';

async function addModeratorRole() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         ADD MODERATOR ROLE TO ADUPASS                      ║
║  UUID: ${ADUPASS_UUID}                ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // Check current roles
    console.log('📋 Checking current roles for Adupass...\n');
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', ADUPASS_UUID);

    if (roles) {
      console.log(`  Current roles: ${roles.length}`);
      roles.forEach(r => {
        console.log(`    • ${r.role} (created: ${r.created_at})`);
      });
      
      const hasAdmin = roles.some(r => r.role === 'admin');
      const hasModerator = roles.some(r => r.role === 'moderator');
      console.log(`
  Has admin role: ${hasAdmin ? '✅' : '❌'}
  Has moderator role: ${hasModerator ? '✅' : '❌'}`);

      if (hasModerator) {
        console.log('\n✅ Adupass already has moderator role!');
        return;
      }
    }

    // Add moderator role
    console.log('\n🔧 Adding moderator role...\n');
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: ADUPASS_UUID,
        role: 'moderator'
      });

    if (error) {
      console.log(`❌ Error adding role: ${JSON.stringify(error, null, 2)}`);
      process.exit(1);
    }

    console.log('✅ Moderator role added successfully!\n');

    // Verify
    const { data: updated } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', ADUPASS_UUID);

    console.log('📋 Updated roles for Adupass:\n');
    if (updated) {
      updated.forEach(r => {
        console.log(`  ✅ ${r.role} (created: ${r.created_at})`);
      });
    }

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

addModeratorRole();
