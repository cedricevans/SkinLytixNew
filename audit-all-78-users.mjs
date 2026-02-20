import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzprefkjpyavwbtkebqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHJlZmtqcHlhdndidGtlYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4ODA0OCwiZXhwIjoyMDcxOTY0MDQ4fQ.87xNuwj8bqm07qNpmAcvqw2wgFK15DpZzqUGnTtwBbA'
);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                   📋 AUDITING ALL 78 USERS - DATA FINGERPRINT                  ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

// All 78 users from validation map with their expected data
const validationMap = [
  { id: 1, name: 'Adupass', email: 'alicia@xiosolutionsllc.com', uuid: '4efb5df3-ce0a-40f6-ae13-6defa1610d3a', scans: 70, events: 811 },
  { id: 2, name: 'Test User', email: 'support@skinlytix.com', uuid: '1efb1396-aa1e-419c-8ba2-1b6366143783', scans: 4, events: 21 },
  { id: 3, name: 'Skylar Farmer', email: 'skylarxiomara@gmail.com', uuid: '002235e1-89ca-4524-a4b4-7f3553d023ce', scans: 1, events: 0 },
  { id: 4, name: 'Neekahgee', email: 'giger.shawnika@gmail.com', uuid: '5880857f-ef2b-4b83-834f-5a312ee67152', scans: 0, events: 1 },
  { id: 5, name: 'Kevin', email: 'jones.k.kevin@gmail.com', uuid: '69a15571-b5e7-4417-90fe-ef1039e2c6a7', scans: 1, events: 0 },
  { id: 6, name: 'Sem', email: 'skifle3@gmail.com', uuid: 'e02f0cae-fe80-4066-adf9-d67225abc3d4', scans: 0, events: 0 },
  { id: 7, name: 'Denae', email: 'denaenicole@comcast.net', uuid: 'f8330e90-48bb-431e-b64e-b71866305698', scans: 2, events: 5 },
  { id: 8, name: 'Paul', email: 'pdupass@gmail.com', uuid: '431d1313-0264-4315-8820-e815ce651170', scans: 0, events: 0 },
  { id: 9, name: 'Elvia Dupass', email: 'exdupass@gmail.com', uuid: 'c4feb2ce-5a3f-47c2-9b87-058d110e6ce7', scans: 3, events: 30 },
  { id: 10, name: 'A3', email: 'autumnanniase@icloud.com', uuid: '02484e4b-b2dd-4c13-9879-65df2995b579', scans: 0, events: 0 },
  { id: 11, name: 'Test user', email: 'axdupass@yahoo.com', uuid: '8534f2c2-24fb-4d55-a99e-1864f058eb97', scans: 2, events: 0 },
  { id: 12, name: 'James', email: 'james.goodnight05@gmail.com', uuid: '4d732879-4cfa-49c1-8b6a-328e707a0428', scans: 24, events: 113 },
  { id: 13, name: 'So_ICy', email: 'icruse125@gmail.com', uuid: 'f87f24a9-30a4-4367-ad56-6674f9642dc8', scans: 3, events: 26 },
  { id: 14, name: 'Alton (test)', email: 'alton.jx@gmail.com', uuid: '5ca997e4-9613-49d4-ab4f-ff56464127a6', scans: 1, events: 0 },
  { id: 15, name: 'daniele', email: 'daniele@toolhouse.ai', uuid: '7d88a687-a996-4b58-ab5f-a60f0648ceff', scans: 1, events: 0 },
  { id: 16, name: 'Kevin', email: 'joneskkevin@gmail.com', uuid: '01a3e2bf-65f8-4395-ae05-c8609cf28dcf', scans: 1, events: 0 },
  { id: 17, name: 'Angela', email: 'angelagrant.a@gmail.com', uuid: '21f8419c-671c-4e13-a8cf-15c099e6b702', scans: 0, events: 0 },
  { id: 18, name: 'Kandace Bridges', email: 'kharris488@gmail.com', uuid: 'ed1ca66f-4cf0-4d6f-8db4-87012cbc3ddf', scans: 3, events: 20 },
  { id: 19, name: 'LIV WILSON', email: 'livwilson105@gmail.com', uuid: 'd26626ba-cd39-47f0-9347-67642bffd452', scans: 1, events: 12 },
  { id: 20, name: 'Victor', email: 'victor.hicks@codingwithculture.com', uuid: 'a74a5827-731c-4e0b-a2ba-ab19a867f76b', scans: 0, events: 5 },
  { id: 21, name: 'Chris "CT" Thomas', email: 'chriseothomas@gmail.com', uuid: '198309c8-8802-47f7-9839-3cce2c8d05f7', scans: 0, events: 2 },
  { id: 22, name: 'Courtney Sumpter', email: 'crtny_sumpter@yahoo.com', uuid: 'fc196879-6d44-42c4-a17b-740d9200fe52', scans: 0, events: 5 },
  { id: 23, name: 'Tres', email: 'cyntressadickey@yahoo.com', uuid: '9ee9e215-b981-4869-9486-0fda6a8f4925', scans: 0, events: 5 },
  { id: 24, name: 'Khec_', email: 'kristi.hector@gmail.com', uuid: '8bfa87b4-c056-4daa-ad9b-bddeede986f3', scans: 0, events: 5 },
  { id: 25, name: 'TcMiles', email: 'tiffany@outlook.con', uuid: 'bb48eb0a-83ef-4e4d-8732-2ec88712397b', scans: 0, events: 5 },
  { id: 26, name: 'NateParker', email: 'nate.p233@gmail.com', uuid: '80399f65-b72d-4111-8aaf-7d101d724c4a', scans: 3, events: 34 },
  { id: 27, name: 'Milly Figuereo', email: 'milagrosestherfiguereo@gmail.com', uuid: 'a62e50b1-9611-4952-aa8e-074373bd7134', scans: 1, events: 28 },
  { id: 28, name: 'Jamie', email: 'jamienewby11@gmail.com', uuid: '3871787a-f143-4a06-8425-ee3d98edfde0', scans: 1, events: 8 },
  { id: 29, name: 'Test User 3', email: 'a.dupass@gmail.com', uuid: '2596e354-cde3-4045-87dd-f4aa815f44a2', scans: 2, events: 39 },
  { id: 30, name: 'Ebony J', email: 'ejowharah@yahoo.com', uuid: '512f5664-03c8-4604-b912-f045c946a352', scans: 0, events: 5 },
  { id: 31, name: 'Christina Branch', email: 'ct_hammonds@yahoo.com', uuid: '86b3f49a-2113-4981-9cd5-cb222ad03fe1', scans: 9, events: 81 },
  { id: 32, name: 'Optimus', email: 'andrecosby87@gmail.com', uuid: '5974c70a-9ee6-4907-9244-107ad4271372', scans: 1, events: 10 },
  { id: 33, name: 'gtjumperzo', email: 'gtjumperzo@gmail.com', uuid: '1b530127-2966-47b3-9743-daa8c8e089a8', scans: 0, events: 26 },
  { id: 34, name: 'DXD', email: 'danax16@gmail.com', uuid: '0d47b715-e7ec-428c-81e6-586bbd202f91', scans: 0, events: 5 },
  { id: 35, name: 'Shanelle', email: 'shanellebwilliams@gmail.com', uuid: 'b35ff543-4919-4604-8f11-3effc991ffb3', scans: 1, events: 16 },
  { id: 36, name: 'Lorna', email: 'lkinlock407@yahoo.com', uuid: 'f8641708-edd7-48c7-987d-c5a29df85326', scans: 0, events: 14 },
  { id: 37, name: 'Thechloebrand', email: 'hello@thechloebrand.com', uuid: 'b9338781-e5f9-49c1-8ee5-583f2117d357', scans: 0, events: 7 },
  { id: 38, name: 'Becky', email: 'beckyb4a@gmail.com', uuid: '8c1d419a-a50a-4810-9f6a-80a3a5d8be71', scans: 0, events: 2 },
  { id: 39, name: 'Arica Ratcliff', email: 'aricaratcliff@gmail.com', uuid: '66e520a5-fc74-456a-8e8d-fef5339875ec', scans: 0, events: 5 },
  { id: 40, name: 'Kevin', email: 'jonesk.kevin@gmail.com', uuid: '7f226ed2-9623-4bca-a473-5ecf31389e2e', scans: 1, events: 12 },
  { id: 41, name: 'Christina Whiten', email: 'whitenc@yahoo.com', uuid: 'c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be', scans: 4, events: 28 },
  { id: 42, name: 'Nee', email: 'anita.swift89@gmail.com', uuid: 'd67f34ee-650b-4f5a-818c-86d699c5252a', scans: 2, events: 10 },
  { id: 43, name: 'Milly Figuereo', email: 'millyfiguereo@gmail.com', uuid: '625b088e-5977-4203-8d7b-27d3ca2ae27b', scans: 4, events: 73 },
  { id: 44, name: 'Dina', email: 'dinadellis@gmail.com', uuid: 'c2ac2da8-acc0-48c0-a7cb-51f96c56f327', scans: 0, events: 6 },
  { id: 45, name: 'Traviaun', email: 'traviaungolden@gmail.com', uuid: '7d2fac66-0c35-4e8b-8a06-e3430e87c85b', scans: 0, events: 7 },
  { id: 46, name: 'Mirian', email: 'mimih23@gmail.com', uuid: '26348ac5-dbfc-4a17-80ca-b0a79ab05084', scans: 0, events: 2 },
  { id: 47, name: 'Candice Martin', email: 'candicem1920@gmail.com', uuid: '4e3c3de3-62f2-462d-818d-78d16dfe4c93', scans: 0, events: 2 },
  { id: 48, name: 'Anthony', email: 'autley10@yahoo.com', uuid: '682e9c56-2d14-4cf0-b874-6596b0ef1a60', scans: 1, events: 15 },
  { id: 49, name: 'Darlene Robinson', email: 'drobin090664@yahoo.com', uuid: '543ad727-efaf-4964-b4c6-cf7cb431657d', scans: 0, events: 5 },
  { id: 50, name: 'Ashley Montes', email: 'montesa0505@gmail.com', uuid: 'edf703c1-3d54-4092-b80e-f11dea1ef40c', scans: 0, events: 3 },
  { id: 51, name: 'Kreeves88', email: 'kevin.reeves11@gmail.com', uuid: '1b0b1f16-aa8f-4679-a127-ba094eea3524', scans: 0, events: 5 },
  { id: 52, name: 'Dub', email: 'william.watkins@salesforce.com', uuid: '3b44e62c-c194-4dda-8b4d-70874139318e', scans: 0, events: 9 },
  { id: 53, name: 'Amerie.Whiten', email: 'ameriewhiten@gmail.com', uuid: 'a3de44aa-d650-4b02-b46e-c452827112b4', scans: 0, events: 2 },
  { id: 54, name: 'Taylor', email: 'taylorsmith.tcs@gmail.com', uuid: '6e8995ac-7f8d-4341-b59c-ea0741259f5a', scans: 0, events: 1 },
  { id: 55, name: 'Traejrc', email: 'cowartjames09@gmail.com', uuid: '181cb709-a11b-411e-acbb-5e32a33c31c7', scans: 5, events: 13 },
  { id: 56, name: 'Itzzaly', email: 'alyssa.gomez827@gmail.com', uuid: '1216d737-ce6e-4b85-ac38-ec16c9ac6c50', scans: 0, events: 7 },
  { id: 57, name: 'gteurika', email: 'gteurika@gmail.com', uuid: '356b550b-87d4-468c-879e-4d529a98ee91', scans: 0, events: 6 },
  { id: 58, name: 'Kim', email: 'kimkelly.law@gmail.com', uuid: 'fafddd84-9740-4789-a215-78e5c1d8cddc', scans: 1, events: 8 },
  { id: 59, name: 'Sandra', email: 'sandramccullough@yahoo.com', uuid: 'b56a05ad-cc29-4c51-9778-c2f1d8d769f9', scans: 1, events: 15 },
  { id: 60, name: 'Stacey', email: 'suarez1920@gmail.com', uuid: 'e039d423-aca3-45a9-8852-b572c65cbb75', scans: 0, events: 8 },
  { id: 61, name: 'Tiffany', email: 'taylorwhitetiff@aol.com', uuid: 'a116901f-7d76-44d2-97e0-4d140a3d7333', scans: 1, events: 12 },
  { id: 62, name: 'Tameka R', email: 't_revere@yahoo.com', uuid: 'efbe63bc-6d9f-47b2-a4a6-b3a687c8618f', scans: 1, events: 13 },
  { id: 63, name: 'Chenae', email: 'chenaewyatt@yahoo.com', uuid: 'c3a94f39-6841-4b8a-8521-02185a573b8a', scans: 3, events: 28 },
  { id: 64, name: 'Zay', email: 'zitbrown@yahoo.com', uuid: '14a16c5f-5afb-4443-855b-7711d13eab6f', scans: 0, events: 5 },
  { id: 65, name: 'Rhonda Gist', email: 'ladygist1@gmail.com', uuid: '8e6ca83d-b7e8-4d46-8af0-e2910676210a', scans: 1, events: 12 },
  { id: 66, name: 'Samantha Miller', email: 'janea92590@gmail.com', uuid: '5f9ef85f-3d28-4024-948d-89d9f658886c', scans: 0, events: 7 },
  { id: 67, name: 'Morgan Riley', email: 'mashriley29@gmail.com', uuid: '6b7d62fb-7c3d-4fde-918f-26c937261e2e', scans: 0, events: 5 },
  { id: 68, name: 'Stacey', email: 'ssuziesuarez@gmail.com', uuid: 'bbe9a7bf-cbd3-4dce-84c7-e2a9782af92a', scans: 3, events: 45 },
  { id: 69, name: 'Ken87', email: 'kendrickg123@yahoo.com', uuid: '45d28611-5076-431e-9236-bbd5f806c414', scans: 1, events: 12 },
  { id: 70, name: 'Ryhill', email: 'reginehill6@gmail.com', uuid: '3442d1fc-939b-4076-ad3b-0f908be2ce43', scans: 0, events: 6 },
  { id: 71, name: 'Cedric', email: 'cedric.evans@gmail.com', uuid: '80c09810-7a89-4c4f-abc5-8f59036cd080', scans: 25, events: 1912 },
  { id: 72, name: 'Darye', email: 'darye@wellcrafted.us', uuid: '890229b4-8fba-4521-9989-5483dcee62f7', scans: 0, events: 8 },
  { id: 73, name: 'P Evans', email: 'pte295@gmail.com', uuid: '2a492020-7e11-4bf2-a028-590b07538859', scans: 3, events: 214 },
  { id: 74, name: 'Stacey Suarez', email: 'stacey.s.suarez@atl.frb.org', uuid: '5e93f015-e9ce-45aa-bc2c-ecfdbfbd6027', scans: 0, events: 6 },
  { id: 75, name: 'Test - Free', email: 'alicia@skinlytix.com', uuid: '64132369-513f-4bd4-982c-e9c31c5a01d9', scans: 4, events: 24 },
  { id: 76, name: 'Patrick E', email: 'pevans@clatyb.com', uuid: 'b9eb3aa9-49e2-4e70-92ea-a23d35de53f5', scans: 0, events: 9 },
  { id: 77, name: 'Ced', email: 'indigowebdesigns@gmail.com', uuid: 'cb4efe71-632f-4f0c-831e-96e9b12a708e', scans: 2, events: 70 },
  { id: 78, name: 'Csg11779', email: 'csg11779@icloud.com', uuid: '8963c7a4-a1bb-4f04-8145-84654e63bc84', scans: 3, events: 27 },
];

let matchCount = 0;
let mismatchCount = 0;
let mismatches = [];

console.log('Checking all 78 users against validation map...\n');

for (const user of validationMap) {
  const { count: scanCount } = await supabase
    .from('user_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.uuid);
  
  const scansMatch = scanCount === user.scans;
  
  if (scansMatch) {
    matchCount++;
    console.log(`✅ #${user.id} ${user.name}: ${scanCount} scans`);
  } else {
    mismatchCount++;
    mismatches.push({ user, actual: scanCount });
    console.log(`❌ #${user.id} ${user.name}: ${scanCount} scans (expected ${user.scans})`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n📊 RESULTS: ${matchCount}/78 users match ✅ | ${mismatchCount} mismatches ❌\n`);

if (mismatchCount > 0) {
  console.log('Mismatched users:');
  mismatches.forEach(m => {
    console.log(`  ${m.user.name} (${m.user.email}): ${m.actual}/${m.user.scans} scans`);
  });
}

