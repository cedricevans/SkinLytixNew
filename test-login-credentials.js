const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mzprefkjpyavwbtkebqj.supabase.co';
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODgwNDgsImV4cCI6MjA3MTk2NDA0OH0.c1AdKtNlfP6bqcuoQiUaCfgFAR-Xqby58RL7fPIMmb0";

async function testLogin() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  
  console.log('🧪 Testing login...\n');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'cedric.evans@gmail.com',
      password: 'pa55word',
    });
    
    if (error) {
      console.log('❌ Login failed');
      console.log('   Error:', error.message);
      console.log('   Status:', error.status);
      console.log('\n⚠️  The user account might not exist or password is incorrect');
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

testLogin();
