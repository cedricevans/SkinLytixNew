/**
 * Create a Test User in Supabase
 * 
 * This script creates a new test user that you can use for dev mode login
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node create-test-user.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mzprefkjpyavwbtkebqj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.error('\nSet it from .env.local:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function createTestUser() {
  try {
    console.log('👤 Creating test user...\n');

    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test.user@skinlytix.dev',
      password: 'Test123!@#',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'Test User',
      }
    });

    if (error) {
      console.error('❌ Error creating user:', error.message);
      return;
    }

    console.log('✅ User created successfully!\n');
    console.log('📋 User Details:');
    console.log('   Email:', data.user?.email);
    console.log('   ID:', data.user?.id);
    console.log('   Created:', data.user?.created_at);

    console.log('\n🔐 Use in Dev Mode:');
    console.log('   URL: http://localhost:8080/?devMode=true&devEmail=test.user@skinlytix.dev&devPassword=Test123!@#');

    console.log('\n📚 Or simpler:');
    console.log('   URL: http://localhost:8080/?devMode=true&devEmail=test.user@skinlytix.dev');
    console.log('   Password: Test123!@#');

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

createTestUser();
