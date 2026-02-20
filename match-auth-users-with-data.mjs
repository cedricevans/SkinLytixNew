import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

// Load env
const envPath = "/Users/cedricevans/Downloads/Work_Station/Skinlytix/.env";
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_PUBLISHABLE_KEY
);

// Auth users from the export (all 78 users)
const authUsers = [
  { id: "4efb5df3-ce0a-40f6-ae13-6defa1610d3a", email: "alicia@xiosolutionsllc.com", name: "Adupass" },
  { id: "1efb1396-aa1e-419c-8ba2-1b6366143783", email: "support@skinlytix.com", name: "Test User" },
  { id: "002235e1-89ca-4524-a4b4-7f3553d023ce", email: "skylarxiomara@gmail.com", name: "Skylar Farmer" },
  { id: "5880857f-ef2b-4b83-834f-5a312ee67152", email: "giger.shawnika@gmail.com", name: "Neekahgee" },
  { id: "69a15571-b5e7-4417-90fe-ef1039e2c6a7", email: "jones.k.kevin@gmail.com", name: "Kevin" },
  { id: "e02f0cae-fe80-4066-adf9-d67225abc3d4", email: "skifle3@gmail.com", name: "Sem" },
  { id: "f8330e90-48bb-431e-b64e-b71866305698", email: "denaenicole@comcast.net", name: "Denae" },
  { id: "431d1313-0264-4315-8820-e815ce651170", email: "pdupass@gmail.com", name: "Paul" },
  { id: "c4feb2ce-5a3f-47c2-9b87-058d110e6ce7", email: "exdupass@gmail.com", name: "Elvia Dupass" },
  { id: "02484e4b-b2dd-4c13-9879-65df2995b579", email: "autumnanniase@icloud.com", name: "A3" },
  { id: "8534f2c2-24fb-4d55-a99e-1864f058eb97", email: "axdupass@yahoo.com", name: "Test user" },
  { id: "4d732879-4cfa-49c1-8b6a-328e707a0428", email: "james.goodnight05@gmail.com", name: "James" },
  { id: "f87f24a9-30a4-4367-ad56-6674f9642dc8", email: "icruse125@gmail.com", name: "So_ICy" },
  { id: "5ca997e4-9613-49d4-ab4f-ff56464127a6", email: "alton.jx@gmail.com", name: "Alton (test)" },
  { id: "7d88a687-a996-4b58-ab5f-a60f0648ceff", email: "daniele@toolhouse.ai", name: "daniele" },
  { id: "01a3e2bf-65f8-4395-ae05-c8609cf28dcf", email: "joneskkevin@gmail.com", name: "Kevin" },
  { id: "21f8419c-671c-4e13-a8cf-15c099e6b702", email: "angelagrant.a@gmail.com", name: "Angela" },
  { id: "ed1ca66f-4cf0-4d6f-8db4-87012cbc3ddf", email: "kharris488@gmail.com", name: "Kandace Bridges" },
  { id: "d26626ba-cd39-47f0-9347-67642bffd452", email: "livwilson105@gmail.com", name: "LIV WILSON" },
  { id: "a74a5827-731c-4e0b-a2ba-ab19a867f76b", email: "victor.hicks@codingwithculture.com", name: "Victor" },
  { id: "198309c8-8802-47f7-9839-3cce2c8d05f7", email: "chriseothomas@gmail.com", name: "Chris \"CT\" Thomas" },
  { id: "fc196879-6d44-42c4-a17b-740d9200fe52", email: "crtny_sumpter@yahoo.com", name: "Courtney Sumpter" },
  { id: "9ee9e215-b981-4869-9486-0fda6a8f4925", email: "cyntressadickey@yahoo.com", name: "Tres" },
  { id: "8bfa87b4-c056-4daa-ad9b-bddeede986f3", email: "kristi.hector@gmail.com", name: "Khec_" },
  { id: "bb48eb0a-83ef-4e4d-8732-2ec88712397b", email: "tiffany@outlook.con", name: "TcMiles" },
  { id: "80399f65-b72d-4111-8aaf-7d101d724c4a", email: "nate.p233@gmail.com", name: "NateParker" },
  { id: "a62e50b1-9611-4952-aa8e-074373bd7134", email: "milagrosestherfiguereo@gmail.com", name: "Milly Figuereo" },
  { id: "3871787a-f143-4a06-8425-ee3d98edfde0", email: "jamienewby11@gmail.com", name: "Jamie" },
  { id: "2596e354-cde3-4045-87dd-f4aa815f44a2", email: "a.dupass@gmail.com", name: "Test User 3" },
  { id: "512f5664-03c8-4604-b912-f045c946a352", email: "ejowharah@yahoo.com", name: "Ebony J" },
  { id: "86b3f49a-2113-4981-9cd5-cb222ad03fe1", email: "ct_hammonds@yahoo.com", name: "Christina Branch" },
  { id: "5974c70a-9ee6-4907-9244-107ad4271372", email: "andrecosby87@gmail.com", name: "Optimus" },
  { id: "1b530127-2966-47b3-9743-daa8c8e089a8", email: "gtjumperzo@gmail.com", name: "gtjumperzo" },
  { id: "0d47b715-e7ec-428c-81e6-586bbd202f91", email: "danax16@gmail.com", name: "DXD" },
  { id: "b35ff543-4919-4604-8f11-3effc991ffb3", email: "shanellebwilliams@gmail.com", name: "Shanelle" },
  { id: "f8641708-edd7-48c7-987d-c5a29df85326", email: "lkinlock407@yahoo.com", name: "Lorna" },
  { id: "b9338781-e5f9-49c1-8ee5-583f2117d357", email: "hello@thechloebrand.com", name: "Thechloebrand" },
  { id: "8c1d419a-a50a-4810-9f6a-80a3a5d8be71", email: "beckyb4a@gmail.com", name: "Becky" },
  { id: "66e520a5-fc74-456a-8e8d-fef5339875ec", email: "aricaratcliff@gmail.com", name: "Arica Ratcliff" },
  { id: "7f226ed2-9623-4bca-a473-5ecf31389e2e", email: "jonesk.kevin@gmail.com", name: "Kevin" },
  { id: "c56a505a-7bf9-4d3e-a4f7-a35bb7f8b8be", email: "whitenc@yahoo.com", name: "Christina Whiten" },
  { id: "d67f34ee-650b-4f5a-818c-86d699c5252a", email: "anita.swift89@gmail.com", name: "Nee" },
  { id: "625b088e-5977-4203-8d7b-27d3ca2ae27b", email: "millyfiguereo@gmail.com", name: "Milly Figuereo" },
  { id: "c2ac2da8-acc0-48c0-a7cb-51f96c56f327", email: "dinadellis@gmail.com", name: "Dina" },
  { id: "7d2fac66-0c35-4e8b-8a06-e3430e87c85b", email: "traviaungolden@gmail.com", name: "Traviaun" },
  { id: "26348ac5-dbfc-4a17-80ca-b0a79ab05084", email: "mimih23@gmail.com", name: "Mirian" },
  { id: "4e3c3de3-62f2-462d-818d-78d16dfe4c93", email: "candicem1920@gmail.com", name: "Candice Martin" },
  { id: "682e9c56-2d14-4cf0-b874-6596b0ef1a60", email: "autley10@yahoo.com", name: "Anthony" },
  { id: "543ad727-efaf-4964-b4c6-cf7cb431657d", email: "drobin090664@yahoo.com", name: "Darlene Robinson" },
  { id: "edf703c1-3d54-4092-b80e-f11dea1ef40c", email: "montesa0505@gmail.com", name: "Ashley Montes" },
  { id: "1b0b1f16-aa8f-4679-a127-ba094eea3524", email: "kevin.reeves11@gmail.com", name: "Kreeves88" },
  { id: "3b44e62c-c194-4dda-8b4d-70874139318e", email: "william.watkins@salesforce.com", name: "Dub" },
  { id: "a3de44aa-d650-4b02-b46e-c452827112b4", email: "ameriewhiten@gmail.com", name: "Amerie.Whiten" },
  { id: "6e8995ac-7f8d-4341-b59c-ea0741259f5a", email: "taylorsmith.tcs@gmail.com", name: "Taylor" },
  { id: "181cb709-a11b-411e-acbb-5e32a33c31c7", email: "cowartjames09@gmail.com", name: "Traejrc" },
  { id: "1216d737-ce6e-4b85-ac38-ec16c9ac6c50", email: "alyssa.gomez827@gmail.com", name: "Itzzaly" },
  { id: "356b550b-87d4-468c-879e-4d529a98ee91", email: "gteurika@gmail.com", name: "gteurika" },
  { id: "fafddd84-9740-4789-a215-78e5c1d8cddc", email: "kimkelly.law@gmail.com", name: "Kim" },
  { id: "b56a05ad-cc29-4c51-9778-c2f1d8d769f9", email: "sandramccullough@yahoo.com", name: "Sandra" },
  { id: "e039d423-aca3-45a9-8852-b572c65cbb75", email: "suarez1920@gmail.com", name: "Stacey" },
  { id: "a116901f-7d76-44d2-97e0-4d140a3d7333", email: "taylorwhitetiff@aol.com", name: "Tiffany" },
  { id: "efbe63bc-6d9f-47b2-a4a6-b3a687c8618f", email: "t_revere@yahoo.com", name: "Tameka R" },
  { id: "c3a94f39-6841-4b8a-8521-02185a573b8a", email: "chenaewyatt@yahoo.com", name: "Chenae" },
  { id: "14a16c5f-5afb-4443-855b-7711d13eab6f", email: "zitbrown@yahoo.com", name: "Zay" },
  { id: "8e6ca83d-b7e8-4d46-8af0-e2910676210a", email: "ladygist1@gmail.com", name: "Rhonda Gist" },
  { id: "5f9ef85f-3d28-4024-948d-89d9f658886c", email: "janea92590@gmail.com", name: "Samantha Miller" },
  { id: "6b7d62fb-7c3d-4fde-918f-26c937261e2e", email: "mashriley29@gmail.com", name: "Morgan Riley" },
  { id: "bbe9a7bf-cbd3-4dce-84c7-e2a9782af92a", email: "ssuziesuarez@gmail.com", name: "Stacey" },
  { id: "45d28611-5076-431e-9236-bbd5f806c414", email: "kendrickg123@yahoo.com", name: "Ken87" },
  { id: "3442d1fc-939b-4076-ad3b-0f908be2ce43", email: "reginehill6@gmail.com", name: "Ryhill" },
  { id: "80c09810-7a89-4c4f-abc5-8f59036cd080", email: "cedric.evans@gmail.com", name: "Cedric" },
  { id: "890229b4-8fba-4521-9989-5483dcee62f7", email: "darye@wellcrafted.us", name: "Darye" },
  { id: "f8330e90-48bb-431e-b64e-b71866305698", email: "denaenicole@comcast.net", name: "Denae" },
  { id: "2a492020-7e11-4bf2-a028-590b07538859", email: "pte295@gmail.com", name: "P Evans" },
  { id: "5e93f015-e9ce-45aa-bc2c-ecfdbfbd6027", email: "stacey.s.suarez@atl.frb.org", name: "Stacey Suarez" },
  { id: "64132369-513f-4bd4-982c-e9c31c5a01d9", email: "alicia@skinlytix.com", name: "Test - Free" },
  { id: "b9eb3aa9-49e2-4e70-92ea-a23d35de53f5", email: "pevans@clatyb.com", name: "Patrick E" },
  { id: "cb4efe71-632f-4f0c-831e-96e9b12a708e", email: "indigowebdesigns@gmail.com", name: "Ced" },
  { id: "8963c7a4-a1bb-4f04-8145-84654e63bc84", email: "csg11779@icloud.com", name: "Csg11779" },
];

console.log("🔍 MATCHING AUTH USERS WITH DATABASE DATA\n");
console.log(`📋 Auth Users to check: ${authUsers.length}\n`);

// Fetch all profiles
const { data: profiles } = await supabase.from("profiles").select("*");
const { data: analyses } = await supabase.from("user_analyses").select("user_id, COUNT(*) as scan_count");

console.log(`✅ Profiles in DB: ${profiles?.length || 0}`);
console.log(`✅ User analyses in DB: ${analyses?.length || 0}\n`);

// Create lookup maps
const profileMap = {};
const scanCountMap = {};

if (profiles) {
  profiles.forEach((p) => {
    profileMap[p.id] = p;
  });
}

if (analyses) {
  analyses.forEach((a) => {
    scanCountMap[a.user_id] = a.scan_count;
  });
}

let matchedCount = 0;
let missingProfileCount = 0;
let missingScansCount = 0;

console.log("📊 MATCH RESULTS:\n");
console.log("| # | UUID | Email | Name | Profile | Scans |");
console.log("|---|------|-------|------|---------|-------|");

const results = [];

for (let i = 0; i < authUsers.length; i++) {
  const user = authUsers[i];
  const profile = profileMap[user.id];
  const scanCount = scanCountMap[user.id] || 0;

  const hasProfile = profile ? "✓" : "✗";
  const hasScans = scanCount > 0 ? `${scanCount}` : "0";

  if (profile && scanCount > 0) {
    matchedCount++;
  }

  if (!profile) {
    missingProfileCount++;
  }

  if (scanCount === 0) {
    missingScansCount++;
  }

  results.push({
    num: i + 1,
    uuid: user.id.substring(0, 8) + "...",
    email: user.email,
    name: user.name,
    profile: hasProfile,
    scans: hasScans,
  });
}

// Print first 30 and last 10
for (let i = 0; i < Math.min(30, results.length); i++) {
  const r = results[i];
  console.log(`| ${r.num} | ${r.uuid} | ${r.email} | ${r.name} | ${r.profile} | ${r.scans} |`);
}

if (results.length > 40) {
  console.log("| ... | ... | ... | ... | ... | ... |");
  for (let i = results.length - 10; i < results.length; i++) {
    const r = results[i];
    console.log(`| ${r.num} | ${r.uuid} | ${r.email} | ${r.name} | ${r.profile} | ${r.scans} |`);
  }
}

console.log("\n📈 SUMMARY:");
console.log(`  ✅ Users with profiles & scans: ${matchedCount}/${authUsers.length}`);
console.log(`  ❌ Missing profiles: ${missingProfileCount}`);
console.log(`  ⚠️  No scans: ${missingScansCount}`);

// Show users with problems
console.log("\n⚠️  USERS WITH ISSUES:\n");

let problemCount = 0;
for (const user of authUsers) {
  const profile = profileMap[user.id];
  const scanCount = scanCountMap[user.id] || 0;

  if (!profile || scanCount === 0) {
    problemCount++;
    console.log(`${problemCount}. ${user.name} (${user.email})`);
    console.log(`   UUID: ${user.id}`);
    if (!profile) console.log(`   ❌ Missing profile`);
    if (scanCount === 0) console.log(`   ⚠️  No scans (${scanCount})`);
    console.log();
  }
}

if (problemCount === 0) {
  console.log("✅ All users are matched correctly!");
}
