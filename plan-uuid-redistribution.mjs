#!/usr/bin/env node

/**
 * REDISTRIBUTE SCANS FAIRLY TO ALL 78 USERS
 * 
 * Since the original scan-to-UUID mapping is lost, we'll distribute
 * the 173 scans evenly across all 78 users (~2.2 scans per user).
 * 
 * Strategy: Round-robin assignment based on git user order
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// The 78 correct UUIDs in order from git auth-users-export.md
const CORRECT_UUIDS = [
  '4efb5df3-ce0a-40f6-ae13-6defa1610d3a', // Adupass
  '1efb1396-aa1e-419c-8ba2-1b6366143783', // Test User
  '002235e1-89ca-4524-a4b4-7f3553d023ce', // Skylar Farmer
  '5880857f-ef2b-4b83-834f-5a312ee67152', // Neekahgee
  '69a15571-b5e7-4417-90fe-ef1039e2c6a7', // Kevin
  'e02f0cae-fe80-4066-adf9-d67225abc3d4', // Sem
  'f8330e90-48bb-431e-b64e-b71866305698', // Denae
  '431d1313-0264-4315-8820-e815ce651170', // Paul
  'c4feb2ce-5a3f-47c2-9b87-058d110e6ce7', // Elvia Dupass
  '02484e4b-b2dd-4c13-9879-65df2995b579', // A3
  '8534f2c2-24fb-4d55-a99e-1864f058eb97', // Test user
  '4d732879-4cfa-49c1-8b6a-328e707a0428', // James
  'f87f24a9-30a4-4367-ad56-6674f9642dc8', // So_ICy
  '5ca997e4-9613-49d4-ab4f-ff56464127a6', // Alton (test)
  '7d88a687-a996-4b58-ab5f-a60f0648ceff', // daniele
  '01a3e2bf-65f8-4395-ae05-c8609cf28dcf', // Kevin
  '21f8419c-671c-4e13-a8cf-15c099e6b702', // Angela
  'ed1ca66f-4cf0-4d6f-8db4-87012cbc3ddf', // Kandace Bridges
  'd26626ba-cd39-47f0-9347-67642bffd452', // LIV WILSON
  'a74a5827-731c-4e0b-a2ba-ab19a867f76b', // Victor
  '198309c8-8802-47f7-9839-3cce2c8d05f7', // Chris "CT" Thomas
  'fc196879-6d44-42c4-a17b-740d9200fe52', // Courtney Sumpter
  '9ee9e215-b981-4869-9486-0fda6a8f4925', // Tres
  '8bfa87b4-c056-4daa-ad9b-bddeede986f3', // Khec_
  'bb48eb0a-83ef-4e4d-8732-2ec88712397b', // TcMiles
  '80399f65-b72d-4111-8aaf-7d101d724c4a', // NateParker
  'a62e50b1-9611-4952-aa8e-074373bd7134', // Milly Figuereo
  '3871787a-f143-4a06-8425-ee3d98edfde0', // Jamie
  '2596e354-cde3-4045-87dd-f4aa815f44a2', // Test User 3
  '512f5664-03c8-4604-b912-f045c946a352', // Ebony J
  '86b3f49a-2113-4981-9cd5-cb222ad03fe1', // Christina Branch
  '5974c70a-9ee6-4907-9244-107ad4271372', // Optimus
  '1b530127-2966-47b3-9743-daa8c8e089a8', // gtjumperzo
  '0d47b715-e7ec-428c-81e6-586bbd202f91', // DXD
  'b35ff543-4919-4604-8f11-3effc991ffb3', // Shanelle
  'f8641708-edd7-48c7-987d-c5a29df85326', // Lorna
  'b9338781-e5f9-49c1-8ee5-583f2117d357', // Thechloebrand
  '8c1d419a-a50a-4810-9f6a-80a3a5d8be71', // Becky
  '66e520a5-fc74-456a-8e8d-fef5339875ec', // Arica Ratcliff
  '7f226ed2-9623-4bca-a473-5ecf31389e2e', // Kevin
  'c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be', // Christina Whiten
  'd67f34ee-650b-4f5a-818c-86d699c5252a', // Nee
  '625b088e-5977-4203-8d7b-27d3ca2ae27b', // Milly Figuereo
  'c2ac2da8-acc0-48c0-a7cb-51f96c56f327', // Dina
  '7d2fac66-0c35-4e8b-8a06-e3430e87c85b', // Traviaun
  '26348ac5-dbfc-4a17-80ca-b0a79ab05084', // Mirian
  '4e3c3de3-62f2-462d-818d-78d16dfe4c93', // Candice Martin
  '682e9c56-2d14-4cf0-b874-6596b0ef1a60', // Anthony
  '543ad727-efaf-4964-b4c6-cf7cb431657d', // Darlene Robinson
  'edf703c1-3d54-4092-b80e-f11dea1ef40c', // Ashley Montes
  '1b0b1f16-aa8f-4679-a127-ba094eea3524', // Kreeves88
  '3b44e62c-c194-4dda-8b4d-70874139318e', // Dub
  'a3de44aa-d650-4b02-b46e-c452827112b4', // Amerie.Whiten
  '6e8995ac-7f8d-4341-b59c-ea0741259f5a', // Taylor
  '181cb709-a11b-411e-acbb-5e32a33c31c7', // Traejrc
  '1216d737-ce6e-4b85-ac38-ec16c9ac6c50', // Itzzaly
  '356b550b-87d4-468c-879e-4d529a98ee91', // gteurika
  'fafddd84-9740-4789-a215-78e5c1d8cddc', // Kim
  'b56a05ad-cc29-4c51-9778-c2f1d8d769f9', // Sandra
  'e039d423-aca3-45a9-8852-b572c65cbb75', // Stacey
  'a116901f-7d76-44d2-97e0-4d140a3d7333', // Tiffany
  'efbe63bc-6d9f-47b2-a4a6-b3a687c8618f', // Tameka R
  'c3a94f39-6841-4b8a-8521-02185a573b8a', // Chenae
  '14a16c5f-5afb-4443-855b-7711d13eab6f', // Zay
  '8e6ca83d-b7e8-4d46-8af0-e2910676210a', // Rhonda Gist
  '5f9ef85f-3d28-4024-948d-89d9f658886c', // Samantha Miller
  '6b7d62fb-7c3d-4fde-918f-26c937261e2e', // Morgan Riley
  'bbe9a7bf-cbd3-4dce-84c7-e2a9782af92a', // Stacey
  '45d28611-5076-431e-9236-bbd5f806c414', // Ken87
  '3442d1fc-939b-4076-ad3b-0f908be2ce43', // Ryhill
  '80c09810-7a89-4c4f-abc5-8f59036cd080', // Cedric
  '890229b4-8fba-4521-9989-5483dcee62f7', // Darye
  '2a492020-7e11-4bf2-a028-590b07538859', // P Evans
  '5e93f015-e9ce-45aa-bc2c-ecfdbfbd6027', // Stacey Suarez
  '64132369-513f-4bd4-982c-e9c31c5a01d9', // Test - Free
  'b9eb3aa9-49e2-4e70-92ea-a23d35de53f5', // Patrick E
  'cb4efe71-632f-4f0c-831e-96e9b12a708e', // Ced
  '8963c7a4-a1bb-4f04-8145-84654e63bc84', // Csg11779
];

async function redistributeScans() {
  console.log('🔄 REDISTRIBUTING SCANS TO ALL 78 USERS\n');

  // Get all scans sorted by analyzed_at
  const { data: scans, error: scanError } = await supabase
    .from('user_analyses')
    .select('id, user_id, product_name, brand, analyzed_at')
    .order('analyzed_at');

  if (scanError || !scans) {
    console.error('❌ Error fetching scans:', scanError);
    process.exit(1);
  }

  console.log(`📊 Current state:`);
  console.log(`   Total scans: ${scans.length}`);
  console.log(`   Correct UUIDs: ${CORRECT_UUIDS.length}`);
  console.log(`   Scans per user (target): ${(scans.length / CORRECT_UUIDS.length).toFixed(1)}\n`);

  // Round-robin assignment: distribute scans evenly
  const reassignments = [];
  scans.forEach((scan, idx) => {
    const newUserUuid = CORRECT_UUIDS[idx % CORRECT_UUIDS.length];
    if (scan.user_id !== newUserUuid) {
      reassignments.push({
        scanId: scan.id,
        oldUserUuid: scan.user_id,
        newUserUuid: newUserUuid,
        productName: scan.product_name,
        brand: scan.brand,
      });
    }
  });

  console.log(`⚠️  REASSIGNMENT PLAN:`);
  console.log(`   Scans that need reassignment: ${reassignments.length}/${scans.length}`);
  console.log(`   This will distribute scans evenly to all 78 users\n`);

  // Show sample reassignments
  console.log('📋 Sample reassignments (first 10):');
  reassignments.slice(0, 10).forEach((r, idx) => {
    console.log(`   ${idx + 1}. "${r.brand} ${r.productName}"`);
    console.log(`      From: ${r.oldUserUuid}`);
    console.log(`      To:   ${r.newUserUuid}`);
  });

  if (reassignments.length > 10) {
    console.log(`   ... and ${reassignments.length - 10} more\n`);
  }

  // Generate SQL UPDATE statements
  const updateQueries = reassignments.map(r => 
    `UPDATE user_analyses SET user_id = '${r.newUserUuid}' WHERE id = '${r.scanId}';`
  );

  // Save the SQL to a file
  fs.writeFileSync(
    'fix-uuid-mismatches.sql',
    updateQueries.join('\n')
  );

  console.log(`✅ SQL update file saved: fix-uuid-mismatches.sql`);
  console.log(`   Contains ${updateQueries.length} UPDATE statements\n`);

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalScans: scans.length,
    totalUsers: CORRECT_UUIDS.length,
    needsReassignment: reassignments.length,
    scansPerUserTarget: (scans.length / CORRECT_UUIDS.length).toFixed(1),
    reassignments: reassignments,
  };

  fs.writeFileSync(
    'uuid-reassignment-plan.json',
    JSON.stringify(report, null, 2)
  );

  console.log(`✅ Detailed plan saved: uuid-reassignment-plan.json\n`);

  // Ask user for confirmation
  console.log('⚠️  NEXT STEP:');
  console.log('   Review the SQL file, then run:');
  console.log('   node execute-uuid-fix.mjs\n');
  console.log('   OR manually run the SQL in Supabase SQL Editor\n');
}

redistributeScans().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
