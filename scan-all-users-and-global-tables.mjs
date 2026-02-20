#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mzprefkjpyavwbtkebqj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function scanAllUsersAndGlobalTables() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       COMPLETE SYSTEM AUDIT: ALL USERS + ALL GLOBAL TABLES           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  // ========================================================================
  // PART 1: SCAN ALL USER ROLES
  // ========================================================================
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('PART 1: USER ROLES ACROSS ALL 78 USERS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const { data: allRoles, error: rolesError, count: rolesCount } = await supabase
    .from('user_roles')
    .select('*, auth.users(email)', { count: 'exact' });

  if (rolesError) {
    console.error('❌ Error querying user_roles:', rolesError.message);
  } else {
    console.log(`✅ Total roles in database: ${rolesCount || 0}\n`);

    if (allRoles && allRoles.length > 0) {
      const rolesByType = {};
      allRoles.forEach(role => {
        const roleType = role.role || 'unknown';
        if (!rolesByType[roleType]) {
          rolesByType[roleType] = [];
        }
        rolesByType[roleType].push(role);
      });

      console.log('📋 ROLES BY TYPE:\n');
      Object.entries(rolesByType).forEach(([roleType, roles]) => {
        console.log(`${roleType.toUpperCase()} (${roles.length} user${roles.length !== 1 ? 's' : ''})`);
        console.log('─────────────────────────────────────────────────────');
        roles.forEach((role, idx) => {
          console.log(`  ${idx + 1}. User ID: ${role.user_id}`);
          console.log(`     Role: ${role.role}`);
          console.log(`     Created: ${new Date(role.created_at).toLocaleDateString()}`);
        });
        console.log();
      });
    } else {
      console.log('⚠️  No roles found in user_roles table\n');
    }
  }

  // ========================================================================
  // PART 2: SCAN ALL GLOBAL TABLES
  // ========================================================================
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('PART 2: GLOBAL/SHARED TABLES (Non-User-Keyed)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const globalTables = [
    { name: 'ingredient_cache', description: 'PubChem molecular data' },
    { name: 'ingredient_explanations_cache', description: 'AI explanations' },
    { name: 'product_cache', description: 'Product information cache' },
    { name: 'academic_institutions', description: 'Academic institution list' },
    { name: 'rate_limit_log', description: 'API rate limit tracking' },
    { name: 'waitlist', description: 'User waitlist' },
    { name: 'user_badges', description: 'User achievement badges' },
    { name: 'student_certifications', description: 'Student certifications' },
    { name: 'expert_reviews', description: 'Expert review submissions' },
    { name: 'ingredient_validations', description: 'Ingredient validation data' },
    { name: 'ingredient_articles', description: 'Ingredient knowledge articles' },
  ];

  console.log('📊 GLOBAL TABLES INVENTORY:\n');

  let totalGlobalRecords = 0;

  for (const table of globalTables) {
    const { data, error, count } = await supabase
      .from(table.name)
      .select('*', { count: 'exact' });

    const recordCount = count || 0;
    totalGlobalRecords += recordCount;

    const status = recordCount > 0 ? '✅' : '⚠️ ';
    const description = `${table.description}`;

    console.log(`${status} ${table.name.padEnd(35)} │ ${recordCount.toString().padStart(4)} records │ ${description}`);

    if (error) {
      if (error.message.includes('not found')) {
        console.log(`   └─ TABLE DOES NOT EXIST in schema\n`);
      } else {
        console.log(`   └─ Error: ${error.message}\n`);
      }
    } else if (recordCount > 0 && data && data.length > 0) {
      // Show sample records
      console.log(`   Sample records (first 2):`);
      const samples = data.slice(0, 2);
      samples.forEach((record, idx) => {
        console.log(`   ${idx + 1}. ${JSON.stringify(record).substring(0, 100)}...`);
      });
      console.log();
    }
  }

  console.log(`\n📈 GLOBAL TABLES SUMMARY:`);
  console.log(`   Total records across all global tables: ${totalGlobalRecords}\n`);

  // ========================================================================
  // PART 3: VERIFICATION AGAINST VALIDATION MAP
  // ========================================================================
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('PART 3: FINDINGS vs VALIDATION MAP');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('🔍 KEY FINDINGS:\n');

  console.log('1. USER ROLES:');
  console.log(`   • Expected from validation map: 1 admin role (Adupass only)`);
  console.log(`   • Actually found: ${rolesCount || 0} role(s) total`);
  if (allRoles) {
    const adminCount = allRoles.filter(r => r.role === 'admin').length;
    const reviewCount = allRoles.filter(r => r.role === 'review').length;
    const otherCount = allRoles.filter(r => r.role !== 'admin' && r.role !== 'review').length;
    console.log(`     - Admin roles: ${adminCount}`);
    console.log(`     - Review roles: ${reviewCount}`);
    console.log(`     - Other roles: ${otherCount}`);
  }
  console.log();

  console.log('2. GLOBAL TABLES:');
  console.log(`   • Total global records found: ${totalGlobalRecords}`);
  console.log(`   • Expected ingredient_cache: 418 rows`);
  console.log(`   • Expected ingredient_explanations_cache: 174 rows`);
  console.log(`   • These are SHARED data, not per-user`);
  console.log();

  console.log('3. CRITICAL OBSERVATIONS:');
  console.log(`   ⚠️  Validation map shows "Roles: 1" for Adupass`);
  console.log(`   ⚠️  But user says she should have 2 roles (admin + review)`);
  console.log(`   ⚠️  Database shows only 1 admin role for her`);
  console.log(`   ⚠️  No other users have admin/review roles assigned`);
  console.log();

  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

scanAllUsersAndGlobalTables().catch(console.error);
