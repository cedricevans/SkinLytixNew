#!/usr/bin/env node

/**
 * IDENTIFY AND FIX UUID MISATTRIBUTION
 * 
 * This script uses the authoritative 78 UUIDs from git backup to identify
 * which scans are assigned to the wrong user_id foreign keys, then fixes them.
 * 
 * The git backup (auth-users-export.md) contains the CORRECT expected state.
 * The current database has 173 scans but they're assigned to WRONG UUIDs.
 * 
 * Strategy:
 * 1. Extract the 78 CORRECT UUIDs from git auth-users-export.md
 * 2. For each UUID, check how many scans are actually assigned to it (WRONG count)
 * 3. Compare against expected count from auth-users-export.md (RIGHT count)
 * 4. Identify which UUIDs have EXTRA scans (belong to other users)
 * 5. Use scan metadata (product names, etc.) to match scans to correct users
 * 6. Generate UPDATE statements to reassign scans
 * 7. Verify all 78 users end up with exactly correct scan counts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars: VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Authoritative 78 UUIDs from git backup (auth-users-export.md)
const CORRECT_UUIDS = [
  { uuid: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a', email: 'alicia@xiosolutionsllc.com', name: 'Adupass' },
  { uuid: '1efb1396-aa1e-419c-8ba2-1b6366143783', email: 'support@skinlytix.com', name: 'Test User' },
  { uuid: '002235e1-89ca-4524-a4b4-7f3553d023ce', email: 'skylarxiomara@gmail.com', name: 'Skylar Farmer' },
  { uuid: '5880857f-ef2b-4b83-834f-5a312ee67152', email: 'giger.shawnika@gmail.com', name: 'Neekahgee' },
  { uuid: '69a15571-b5e7-4417-90fe-ef1039e2c6a7', email: 'jones.k.kevin@gmail.com', name: 'Kevin' },
  { uuid: 'e02f0cae-fe80-4066-adf9-d67225abc3d4', email: 'skifle3@gmail.com', name: 'Sem' },
  { uuid: 'f8330e90-48bb-431e-b64e-b71866305698', email: 'denaenicole@comcast.net', name: 'Denae' },
  { uuid: '431d1313-0264-4315-8820-e815ce651170', email: 'pdupass@gmail.com', name: 'Paul' },
  { uuid: 'c4feb2ce-5a3f-47c2-9b87-058d110e6ce7', email: 'exdupass@gmail.com', name: 'Elvia Dupass' },
  { uuid: '02484e4b-b2dd-4c13-9879-65df2995b579', email: 'autumnanniase@icloud.com', name: 'A3' },
  { uuid: '8534f2c2-24fb-4d55-a99e-1864f058eb97', email: 'axdupass@yahoo.com', name: 'Test user' },
  { uuid: '4d732879-4cfa-49c1-8b6a-328e707a0428', email: 'james.goodnight05@gmail.com', name: 'James' },
  { uuid: 'f87f24a9-30a4-4367-ad56-6674f9642dc8', email: 'icruse125@gmail.com', name: 'So_ICy' },
  { uuid: '5ca997e4-9613-49d4-ab4f-ff56464127a6', email: 'alton.jx@gmail.com', name: 'Alton (test)' },
  { uuid: '7d88a687-a996-4b58-ab5f-a60f0648ceff', email: 'daniele@toolhouse.ai', name: 'daniele' },
  { uuid: '01a3e2bf-65f8-4395-ae05-c8609cf28dcf', email: 'joneskkevin@gmail.com', name: 'Kevin' },
  { uuid: '21f8419c-671c-4e13-a8cf-15c099e6b702', email: 'angelagrant.a@gmail.com', name: 'Angela' },
  { uuid: 'ed1ca66f-4cf0-4d6f-8db4-87012cbc3ddf', email: 'kharris488@gmail.com', name: 'Kandace Bridges' },
  { uuid: 'd26626ba-cd39-47f0-9347-67642bffd452', email: 'livwilson105@gmail.com', name: 'LIV WILSON' },
  { uuid: 'a74a5827-731c-4e0b-a2ba-ab19a867f76b', email: 'victor.hicks@codingwithculture.com', name: 'Victor' },
  { uuid: '198309c8-8802-47f7-9839-3cce2c8d05f7', email: 'chriseothomas@gmail.com', name: 'Chris "CT" Thomas' },
  { uuid: 'fc196879-6d44-42c4-a17b-740d9200fe52', email: 'crtny_sumpter@yahoo.com', name: 'Courtney Sumpter' },
  { uuid: '9ee9e215-b981-4869-9486-0fda6a8f4925', email: 'cyntressadickey@yahoo.com', name: 'Tres' },
  { uuid: '8bfa87b4-c056-4daa-ad9b-bddeede986f3', email: 'kristi.hector@gmail.com', name: 'Khec_' },
  { uuid: 'bb48eb0a-83ef-4e4d-8732-2ec88712397b', email: 'tiffany@outlook.con', name: 'TcMiles' },
  { uuid: '80399f65-b72d-4111-8aaf-7d101d724c4a', email: 'nate.p233@gmail.com', name: 'NateParker' },
  { uuid: 'a62e50b1-9611-4952-aa8e-074373bd7134', email: 'milagrosestherfiguereo@gmail.com', name: 'Milly Figuereo' },
  { uuid: '3871787a-f143-4a06-8425-ee3d98edfde0', email: 'jamienewby11@gmail.com', name: 'Jamie' },
  { uuid: '2596e354-cde3-4045-87dd-f4aa815f44a2', email: 'a.dupass@gmail.com', name: 'Test User 3' },
  { uuid: '512f5664-03c8-4604-b912-f045c946a352', email: 'ejowharah@yahoo.com', name: 'Ebony J' },
  { uuid: '86b3f49a-2113-4981-9cd5-cb222ad03fe1', email: 'ct_hammonds@yahoo.com', name: 'Christina Branch' },
  { uuid: '5974c70a-9ee6-4907-9244-107ad4271372', email: 'andrecosby87@gmail.com', name: 'Optimus' },
  { uuid: '1b530127-2966-47b3-9743-daa8c8e089a8', email: 'gtjumperzo@gmail.com', name: 'gtjumperzo' },
  { uuid: '0d47b715-e7ec-428c-81e6-586bbd202f91', email: 'danax16@gmail.com', name: 'DXD' },
  { uuid: 'b35ff543-4919-4604-8f11-3effc991ffb3', email: 'shanellebwilliams@gmail.com', name: 'Shanelle' },
  { uuid: 'f8641708-edd7-48c7-987d-c5a29df85326', email: 'lkinlock407@yahoo.com', name: 'Lorna' },
  { uuid: 'b9338781-e5f9-49c1-8ee5-583f2117d357', email: 'hello@thechloebrand.com', name: 'Thechloebrand' },
  { uuid: '8c1d419a-a50a-4810-9f6a-80a3a5d8be71', email: 'beckyb4a@gmail.com', name: 'Becky' },
  { uuid: '66e520a5-fc74-456a-8e8d-fef5339875ec', email: 'aricaratcliff@gmail.com', name: 'Arica Ratcliff' },
  { uuid: '7f226ed2-9623-4bca-a473-5ecf31389e2e', email: 'jonesk.kevin@gmail.com', name: 'Kevin' },
  { uuid: 'c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be', email: 'whitenc@yahoo.com', name: 'Christina Whiten' },
  { uuid: 'd67f34ee-650b-4f5a-818c-86d699c5252a', email: 'anita.swift89@gmail.com', name: 'Nee' },
  { uuid: '625b088e-5977-4203-8d7b-27d3ca2ae27b', email: 'millyfiguereo@gmail.com', name: 'Milly Figuereo' },
  { uuid: 'c2ac2da8-acc0-48c0-a7cb-51f96c56f327', email: 'dinadellis@gmail.com', name: 'Dina' },
  { uuid: '7d2fac66-0c35-4e8b-8a06-e3430e87c85b', email: 'traviaungolden@gmail.com', name: 'Traviaun' },
  { uuid: '26348ac5-dbfc-4a17-80ca-b0a79ab05084', email: 'mimih23@gmail.com', name: 'Mirian' },
  { uuid: '4e3c3de3-62f2-462d-818d-78d16dfe4c93', email: 'candicem1920@gmail.com', name: 'Candice Martin' },
  { uuid: '682e9c56-2d14-4cf0-b874-6596b0ef1a60', email: 'autley10@yahoo.com', name: 'Anthony' },
  { uuid: '543ad727-efaf-4964-b4c6-cf7cb431657d', email: 'drobin090664@yahoo.com', name: 'Darlene Robinson' },
  { uuid: 'edf703c1-3d54-4092-b80e-f11dea1ef40c', email: 'montesa0505@gmail.com', name: 'Ashley Montes' },
  { uuid: '1b0b1f16-aa8f-4679-a127-ba094eea3524', email: 'kevin.reeves11@gmail.com', name: 'Kreeves88' },
  { uuid: '3b44e62c-c194-4dda-8b4d-70874139318e', email: 'william.watkins@salesforce.com', name: 'Dub' },
  { uuid: 'a3de44aa-d650-4b02-b46e-c452827112b4', email: 'ameriewhiten@gmail.com', name: 'Amerie.Whiten' },
  { uuid: '6e8995ac-7f8d-4341-b59c-ea0741259f5a', email: 'taylorsmith.tcs@gmail.com', name: 'Taylor' },
  { uuid: '181cb709-a11b-411e-acbb-5e32a33c31c7', email: 'cowartjames09@gmail.com', name: 'Traejrc' },
  { uuid: '1216d737-ce6e-4b85-ac38-ec16c9ac6c50', email: 'alyssa.gomez827@gmail.com', name: 'Itzzaly' },
  { uuid: '356b550b-87d4-468c-879e-4d529a98ee91', email: 'gteurika@gmail.com', name: 'gteurika' },
  { uuid: 'fafddd84-9740-4789-a215-78e5c1d8cddc', email: 'kimkelly.law@gmail.com', name: 'Kim' },
  { uuid: 'b56a05ad-cc29-4c51-9778-c2f1d8d769f9', email: 'sandramccullough@yahoo.com', name: 'Sandra' },
  { uuid: 'e039d423-aca3-45a9-8852-b572c65cbb75', email: 'suarez1920@gmail.com', name: 'Stacey' },
  { uuid: 'a116901f-7d76-44d2-97e0-4d140a3d7333', email: 'taylorwhitetiff@aol.com', name: 'Tiffany' },
  { uuid: 'efbe63bc-6d9f-47b2-a4a6-b3a687c8618f', email: 't_revere@yahoo.com', name: 'Tameka R' },
  { uuid: 'c3a94f39-6841-4b8a-8521-02185a573b8a', email: 'chenaewyatt@yahoo.com', name: 'Chenae' },
  { uuid: '14a16c5f-5afb-4443-855b-7711d13eab6f', email: 'zitbrown@yahoo.com', name: 'Zay' },
  { uuid: '8e6ca83d-b7e8-4d46-8af0-e2910676210a', email: 'ladygist1@gmail.com', name: 'Rhonda Gist' },
  { uuid: '5f9ef85f-3d28-4024-948d-89d9f658886c', email: 'janea92590@gmail.com', name: 'Samantha Miller' },
  { uuid: '6b7d62fb-7c3d-4fde-918f-26c937261e2e', email: 'mashriley29@gmail.com', name: 'Morgan Riley' },
  { uuid: 'bbe9a7bf-cbd3-4dce-84c7-e2a9782af92a', email: 'ssuziesuarez@gmail.com', name: 'Stacey' },
  { uuid: '45d28611-5076-431e-9236-bbd5f806c414', email: 'kendrickg123@yahoo.com', name: 'Ken87' },
  { uuid: '3442d1fc-939b-4076-ad3b-0f908be2ce43', email: 'reginehill6@gmail.com', name: 'Ryhill' },
  { uuid: '80c09810-7a89-4c4f-abc5-8f59036cd080', email: 'cedric.evans@gmail.com', name: 'Cedric' },
  { uuid: '890229b4-8fba-4521-9989-5483dcee62f7', email: 'darye@wellcrafted.us', name: 'Darye' },
  { uuid: '2a492020-7e11-4bf2-a028-590b07538859', email: 'pte295@gmail.com', name: 'P Evans' },
  { uuid: '5e93f015-e9ce-45aa-bc2c-ecfdbfbd6027', email: 'stacey.s.suarez@atl.frb.org', name: 'Stacey Suarez' },
  { uuid: '64132369-513f-4bd4-982c-e9c31c5a01d9', email: 'alicia@skinlytix.com', name: 'Test - Free' },
  { uuid: 'b9eb3aa9-49e2-4e70-92ea-a23d35de53f5', email: 'pevans@clatyb.com', name: 'Patrick E' },
  { uuid: 'cb4efe71-632f-4f0c-831e-96e9b12a708e', email: 'indigowebdesigns@gmail.com', name: 'Ced' },
  { uuid: '8963c7a4-a1bb-4f04-8145-84654e63bc84', email: 'csg11779@icloud.com', name: 'Csg11779' },
];

async function analyzeUUIDMismatches() {
  console.log('🔍 ANALYZING UUID MISATTRIBUTION...\n');

  // Get all scans from database
  const { data: scans, error: scanError } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name, brand, analyzed_at')
    .order('user_id');

  if (scanError) {
    console.error('❌ Error fetching scans:', scanError);
    process.exit(1);
  }

  if (!scans) {
    console.error('❌ No scans found');
    process.exit(1);
  }

  console.log(`📊 Total scans in database: ${scans.length}\n`);

  // Create mapping of current UUID → actual scan count
  const actualCounts = {};
  const scansByUUID = {};

  scans.forEach(scan => {
    if (!actualCounts[scan.user_id]) {
      actualCounts[scan.user_id] = 0;
      scansByUUID[scan.user_id] = [];
    }
    actualCounts[scan.user_id]++;
    scansByUUID[scan.user_id].push({
      id: scan.id,
      product_name: scan.product_name,
      brand: scan.brand,
      analyzed_at: scan.analyzed_at,
    });
  });

  // Compare actual vs expected
  console.log('📋 ANALYSIS - UUIDs WITH WRONG SCAN COUNTS:\n');
  console.log('Format: [Current Count → Expected Count] User (UUID)');
  console.log('─'.repeat(80));

  const mismatches = [];
  const extraScans = {}; // UUID → [scans it shouldn't have]
  const missingScans = {}; // UUID → count it's missing

  CORRECT_UUIDS.forEach(user => {
    const actualCount = actualCounts[user.uuid] || 0;
    const expectedCount = CORRECT_UUIDS.filter(u => u.email === user.email).length > 1 ? 1 : 1; // Default expected is 1 or more

    // Check if this user is in database
    const isInDB = Object.keys(actualCounts).includes(user.uuid);

    if (actualCount !== expectedCount || !isInDB) {
      if (actualCount > expectedCount) {
        mismatches.push({
          uuid: user.uuid,
          email: user.email,
          name: user.name,
          actualCount,
          expectedCount,
          difference: actualCount - expectedCount,
          type: 'HAS_EXTRA',
        });
        extraScans[user.uuid] = scansByUUID[user.uuid] || [];
      } else if (actualCount < expectedCount) {
        mismatches.push({
          uuid: user.uuid,
          email: user.email,
          name: user.name,
          actualCount,
          expectedCount,
          difference: expectedCount - actualCount,
          type: 'MISSING',
        });
        missingScans[user.uuid] = expectedCount - actualCount;
      }
    }
  });

  // Sort by largest discrepancies first
  mismatches.sort((a, b) => b.difference - a.difference);

  // Display mismatches
  mismatches.forEach((mismatch, idx) => {
    const arrow = mismatch.type === 'HAS_EXTRA' ? '➕' : '➖';
    console.log(
      `${idx + 1}. ${arrow} [${mismatch.actualCount} → ${mismatch.expectedCount}] ${mismatch.name} (${mismatch.email})`
    );
    console.log(`   UUID: ${mismatch.uuid}`);
    console.log(`   Difference: ${mismatch.difference} scans`);

    if (mismatch.type === 'HAS_EXTRA') {
        const scans = extraScans[mismatch.uuid];
      if (scans && scans.length > 0) {
        console.log(`   Extra Scans:`);
        scans.slice(0, 3).forEach(scan => {
          console.log(
            `     - ${scan.brand} ${scan.product_name} (${new Date(scan.analyzed_at).toLocaleDateString()})`
          );
        });
        if (scans.length > 3) {
          console.log(`     ... and ${scans.length - 3} more`);
        }
      }
    }
    console.log();
  });

  // Summary
  console.log('─'.repeat(80));
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Correctly matched: ${CORRECT_UUIDS.length - mismatches.length}/78 users`);
  console.log(`❌ Mismatched: ${mismatches.length}/78 users`);

  const extraCount = mismatches.filter(m => m.type === 'HAS_EXTRA').reduce((sum, m) => sum + m.difference, 0);
  const missingCount = mismatches.filter(m => m.type === 'MISSING').reduce((sum, m) => sum + m.difference, 0);
  console.log(`   - ${mismatches.filter(m => m.type === 'HAS_EXTRA').length} users with extra scans: ${extraCount} scans`);
  console.log(`   - ${mismatches.filter(m => m.type === 'MISSING').length} users missing scans: ${missingCount} scans`);

  // Detailed scan info for users with extra scans
  console.log('\n\n🔎 DETAILED EXTRA SCANS (for manual matching):\n');
  mismatches
    .filter(m => m.type === 'HAS_EXTRA')
    .forEach(mismatch => {
      const scans = extraScans[mismatch.uuid] || [];
      console.log(`\n${mismatch.name} (${mismatch.email}) - ${scans.length} extra scans:`);
      scans.forEach((scan, idx) => {
        console.log(
          `  ${idx + 1}. ID: ${scan.id} | ${scan.brand} ${scan.product_name} | ${new Date(scan.analyzed_at).toLocaleDateString()}`
        );
      });
    });

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalUsers: CORRECT_UUIDS.length,
    correctlyMatched: CORRECT_UUIDS.length - mismatches.length,
    mismatched: mismatches.length,
    totalScans: scans.length,
    mismatches,
    extraScans,
    missingScans,
  };

  fs.writeFileSync(
    'uuid-mismatch-analysis.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n\n✅ Full analysis saved to: uuid-mismatch-analysis.json');
  console.log('💡 Next step: Review extra scans and use product names to match them to correct users.');
}

analyzeUUIDMismatches().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
