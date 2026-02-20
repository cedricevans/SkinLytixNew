import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

// The 34 missing users that need to be restored
const MISSING_USERS = [
  { email: 'lkinlock407@yahoo.com', uuid: 'f8641708-edd7-48c7-987d-c5a29df85326', name: 'Lorna' },
  { email: 'hello@thechloebrand.com', uuid: 'b9338781-e5f9-49c1-8ee5-583f2117d357', name: 'Thechloebrand' },
  { email: 'beckyb4a@gmail.com', uuid: '8c1d419a-a50a-4810-9f6a-80a3a5d8be71', name: 'Becky' },
  { email: 'aricaratcliff@gmail.com', uuid: '66e520a5-fc74-456a-8e8d-fef5339875ec', name: 'Arica Ratcliff' },
  { email: 'jonesk.kevin@gmail.com', uuid: '7f226ed2-9623-4bca-a473-5ecf31389e2e', name: 'Kevin' },
  { email: 'whitenc@yahoo.com', uuid: 'c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be', name: 'Christina Whiten' },
  { email: 'anita.swift89@gmail.com', uuid: 'd67f34ee-650b-4f5a-818c-86d699c5252a', name: 'Nee' },
  { email: 'millyfiguereo@gmail.com', uuid: '625b088e-5977-4203-8d7b-27d3ca2ae27b', name: 'Milly Figuereo' },
  { email: 'dinadellis@gmail.com', uuid: 'c2ac2da8-acc0-48c0-a7cb-51f96c56f327', name: 'Dina' },
  { email: 'traviaungolden@gmail.com', uuid: '7d2fac66-0c35-4e8b-8a06-e3430e87c85b', name: 'Traviaun' },
  { email: 'mimih23@gmail.com', uuid: '26348ac5-dbfc-4a17-80ca-b0a79ab05084', name: 'Mirian' },
  { email: 'candicem1920@gmail.com', uuid: '4e3c3de3-62f2-462d-818d-78d16dfe4c93', name: 'Candice Martin' },
  { email: 'drobin090664@yahoo.com', uuid: '543ad727-efaf-4964-b4c6-cf7cb431657d', name: 'Darlene Robinson' },
  { email: 'montesa0505@gmail.com', uuid: 'edf703c1-3d54-4092-b80e-f11dea1ef40c', name: 'Ashley Montes' },
  { email: 'kevin.reeves11@gmail.com', uuid: '1b0b1f16-aa8f-4679-a127-ba094eea3524', name: 'Kreeves88' },
  { email: 'william.watkins@salesforce.com', uuid: '3b44e62c-c194-4dda-8b4d-70874139318e', name: 'Dub' },
  { email: 'ameriewhiten@gmail.com', uuid: 'a3de44aa-d650-4b02-b46e-c452827112b4', name: 'Amerie.Whiten' },
  { email: 'taylorsmith.tcs@gmail.com', uuid: '6e8995ac-7f8d-4341-b59c-ea0741259f5a', name: 'Taylor' },
  { email: 'alyssa.gomez827@gmail.com', uuid: '1216d737-ce6e-4b85-ac38-ec16c9ac6c50', name: 'Itzzaly' },
  { email: 'gteurika@gmail.com', uuid: '356b550b-87d4-468c-879e-4d529a98ee91', name: 'gteurika' },
  { email: 'suarez1920@gmail.com', uuid: 'e039d423-aca3-45a9-8852-b572c65cbb75', name: 'Stacey' },
  { email: 'taylorwhitetiff@aol.com', uuid: 'a116901f-7d76-44d2-97e0-4d140a3d7333', name: 'Tiffany' },
  { email: 'chenaewyatt@yahoo.com', uuid: 'c3a94f39-6841-4b8a-8521-02185a573b8a', name: 'Chenae' },
  { email: 'zitbrown@yahoo.com', uuid: '14a16c5f-5afb-4443-855b-7711d13eab6f', name: 'Zay' },
  { email: 'janea92590@gmail.com', uuid: '5f9ef85f-3d28-4024-948d-89d9f658886c', name: 'Samantha Miller' },
  { email: 'mashriley29@gmail.com', uuid: '6b7d62fb-7c3d-4fde-918f-26c937261e2e', name: 'Morgan Riley' },
  { email: 'kendrickg123@yahoo.com', uuid: '45d28611-5076-431e-9236-bbd5f806c414', name: 'Ken87' },
  { email: 'reginehill6@gmail.com', uuid: '3442d1fc-939b-4076-ad3b-0f908be2ce43', name: 'Ryhill' },
  { email: 'darye@wellcrafted.us', uuid: '890229b4-8fba-4521-9989-5483dcee62f7', name: 'Darye' },
  { email: 'pte295@gmail.com', uuid: '2a492020-7e11-4bf2-a028-590b07538859', name: 'P Evans' },
  { email: 'stacey.s.suarez@atl.frb.org', uuid: '5e93f015-e9ce-45aa-bc2c-ecfdbfbd6027', name: 'Stacey Suarez' },
  { email: 'pevans@clatyb.com', uuid: 'b9eb3aa9-49e2-4e70-92ea-a23d35de53f5', name: 'Patrick E' },
  { email: 'indigowebdesigns@gmail.com', uuid: 'cb4efe71-632f-4f0c-831e-96e9b12a708e', name: 'Ced' },
  { email: 'csg11779@icloud.com', uuid: '8963c7a4-a1bb-4f04-8145-84654e63bc84', name: 'Csg11779' }
];

(async () => {
  try {
    console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                  RESTORING 34 ACCIDENTALLY DELETED USERS                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

    let restored = 0;
    let failed = 0;

    for (const user of MISSING_USERS) {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.uuid,
          email: user.email,
          display_name: user.name,
          subscription_tier: 'free'
        });

      if (!error) {
        console.log(`✅ Restored: ${user.email}`);
        restored++;
      } else {
        console.log(`❌ Failed: ${user.email} - ${error.message}`);
        failed++;
      }
    }

    console.log(`\n✅ Restored: ${restored} users`);
    console.log(`❌ Failed: ${failed} users`);
    console.log(`\nDatabase should now have 78 profiles (45 existing + 34 restored)\n`);

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
})();
