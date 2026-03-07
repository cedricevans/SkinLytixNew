const fs = require('fs');
const path = require('path');

// Test if supabase client file exists
const clientPath = path.join(__dirname, 'src/integrations/supabase/client.ts');
console.log('Checking for client.ts...');
if (fs.existsSync(clientPath)) {
  console.log('✓ client.ts exists');
  console.log('File size:', fs.statSync(clientPath).size, 'bytes');
  const content = fs.readFileSync(clientPath, 'utf8');
  console.log('First 100 chars:', content.substring(0, 100));
} else {
  console.log('✗ client.ts NOT FOUND');
}
