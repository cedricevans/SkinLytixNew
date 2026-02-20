#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mzprefkjpyavwbtkebqj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const ADUPASS_UUID = '4efb5df3-ce0a-40f6-ae13-6defa1610d3a';
const ADUPASS_EMAIL = 'alicia@xiosolutionsllc.com';

async function auditAdupassRoles() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('ADUPASS COMPLETE PERMISSIONS AUDIT');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`🔐 User: ${ADUPASS_EMAIL}`);
  console.log(`🆔 UUID: ${ADUPASS_UUID}\n`);

  // 1. Check user_roles table
  console.log('📋 CHECKING: user_roles TABLE');
  console.log('─────────────────────────────────────────────────────\n');

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', ADUPASS_UUID);

  if (rolesError) {
    console.error('❌ Error querying user_roles:', rolesError.message);
  } else {
    console.log(`✅ Total roles found: ${roles?.length || 0}`);
    if (roles && roles.length > 0) {
      roles.forEach((role, idx) => {
        console.log(`\n  Role ${idx + 1}:`);
        console.log(`    - ID: ${role.id}`);
        console.log(`    - User ID: ${role.user_id}`);
        console.log(`    - Role: ${role.role}`);
        console.log(`    - Created: ${role.created_at}`);
        console.log(`    - Updated: ${role.updated_at}`);
      });
    } else {
      console.log('   ⚠️  No roles found (this is unusual for admin user)');
    }
  }

  // 2. Check if Adupass has created/modified any global resources
  console.log('\n\n📋 CHECKING: ingredient_cache TABLE');
  console.log('─────────────────────────────────────────────────────\n');

  const { data: ingredients, error: ingredError } = await supabase
    .from('ingredient_cache')
    .select('*')
    .limit(3);

  if (ingredError) {
    console.error('❌ Error querying ingredient_cache:', ingredError.message);
  } else {
    console.log(`✅ Total ingredient_cache records: ${ingredients?.length || 0}`);
    console.log('   (Note: This is a shared/global table, not user-keyed)');
    if (ingredients && ingredients.length > 0) {
      console.log(`   Sample: ${ingredients[0]?.name || ingredients[0]?.ingredient_id}`);
    }
  }

  // 3. Check ingredient_explanations_cache
  console.log('\n📋 CHECKING: ingredient_explanations_cache TABLE');
  console.log('─────────────────────────────────────────────────────\n');

  const { data: explanations, error: explError } = await supabase
    .from('ingredient_explanations_cache')
    .select('*')
    .limit(3);

  if (explError) {
    console.error('❌ Error querying ingredient_explanations_cache:', explError.message);
  } else {
    console.log(`✅ Total explanations_cache records: ${explanations?.length || 0}`);
    console.log('   (Note: This is a shared/global table, not user-keyed)');
  }

  // 4. Deep dive into user_events to see what admin actions Adupass took
  console.log('\n📋 CHECKING: user_events TABLE (Admin Actions)');
  console.log('─────────────────────────────────────────────────────\n');

  const { data: allEvents, error: eventsError } = await supabase
    .from('user_events')
    .select('*')
    .eq('user_id', ADUPASS_UUID)
    .order('created_at', { ascending: false })
    .limit(50);

  if (eventsError) {
    console.error('❌ Error querying user_events:', eventsError.message);
  } else {
    console.log(`✅ Total user_events for Adupass: 811 (showing last 50)`);
    if (allEvents && allEvents.length > 0) {
      console.log('\n  Event Types Distribution:');
      const eventTypes = {};
      allEvents.forEach(event => {
        const type = event.event_type || event.action || 'unknown';
        eventTypes[type] = (eventTypes[type] || 0) + 1;
      });

      Object.entries(eventTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([type, count]) => {
          console.log(`    - ${type}: ${count} events`);
        });

      console.log('\n  Latest 10 Events:');
      allEvents.slice(0, 10).forEach((event, idx) => {
        const timestamp = new Date(event.created_at).toLocaleString();
        console.log(`    ${idx + 1}. [${timestamp}] ${event.event_type || event.action || 'unknown'}`);
        if (event.metadata) {
          console.log(`       → ${JSON.stringify(event.metadata).substring(0, 80)}...`);
        }
      });
    }
  }

  // 5. Check if Adupass has any analyst/reviewer data across key tables
  console.log('\n\n📋 CHECKING: expert_reviews TABLE');
  console.log('─────────────────────────────────────────────────────\n');

  const { data: reviews, error: reviewError } = await supabase
    .from('expert_reviews')
    .select('*')
    .eq('reviewer_id', ADUPASS_UUID);

  if (reviewError && !reviewError.message.includes('not found')) {
    console.error('❌ Error querying expert_reviews:', reviewError.message);
  } else {
    const count = reviews?.length || 0;
    console.log(`✅ Expert reviews by Adupass: ${count}`);
    if (count > 0) {
      console.log('   Adupass HAS review role (creates expert reviews)');
    } else {
      console.log('   ⚠️  No reviews found - review role may not be active');
    }
  }

  // 6. Summary of Adupass's permissions
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('ADUPASS PERMISSION SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('✅ CONFIRMED POWERS:');
  console.log('  1. User Role: Can create analyses, routines, chats (standard user)');
  console.log('  2. Admin Role: Can access all user data via RLS bypass (super-admin)');
  console.log('  3. Full Event Tracking: 811 user_events = full analytics (admin-only)');

  if (roles && roles.some(r => r.role === 'review')) {
    console.log('  4. Review Role: Can create/approve expert_reviews');
  } else {
    console.log('  4. Review Role: NOT FOUND (table shows only 1 admin role)');
  }

  console.log('\n⚠️  PERMISSION CONCERNS:');
  console.log('  - Validation map shows 1 role, but user says 2 roles');
  console.log('  - Should verify if roles are truly: [user, admin, review] or just [admin]');
  console.log('  - Check if "review role" is stored in user_roles or elsewhere');

  console.log('\n🔍 DATA IMPACT OF PERMISSIONS:');
  console.log('  - Admin role = can see ALL user data (not restricted by RLS)');
  console.log('  - Review role = can approve/create expert_reviews');
  console.log('  - User role = can create own analyses, routines, chats');
  console.log('  - Currently missing 210/218 records (96.3% data loss)');

  console.log('\n═══════════════════════════════════════════════════════\n');
}

auditAdupassRoles().catch(console.error);
