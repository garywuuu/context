/**
 * Utility script to generate API keys
 * Usage: npx tsx scripts/generate-api-key.ts <organization-id> <key-name>
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file (Next.js does this automatically, but tsx doesn't)
config({ path: resolve(__dirname, '../.env.local') });

// Create Supabase client directly (don't import from lib)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// API Key format: cg_{env}_{random}
// Example: cg_live_sk_abc123def456ghi789jkl012mno345pqr678stu901

function generateApiKey(env: 'test' | 'live' = 'test'): {
  key: string;
  prefix: string;
  hash: string;
} {
  // Generate random bytes for the key
  const randomPart = randomBytes(24).toString('hex'); // 48 characters

  // Construct full key
  const key = `cg_${env}_sk_${randomPart}`;

  // Extract prefix (first 12 characters)
  const prefix = key.substring(0, 12);

  // Generate bcrypt hash
  const hash = bcrypt.hashSync(key, 10);

  return { key, prefix, hash };
}

async function createApiKey(
  organizationId: string,
  name: string,
  env: 'test' | 'live' = 'test'
): Promise<void> {
  const { key, prefix, hash } = generateApiKey(env);

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      organization_id: organizationId,
      key_prefix: prefix,
      key_hash: hash,
      name,
      scopes: ['read', 'write'],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating API key:', error);
    throw error;
  }

  console.log('\n✅ API Key Created Successfully!\n');
  console.log('─'.repeat(60));
  console.log(`Organization ID: ${organizationId}`);
  console.log(`Key Name:        ${name}`);
  console.log(`Key ID:          ${data.id}`);
  console.log(`Environment:     ${env}`);
  console.log('─'.repeat(60));
  console.log('\n🔑 API Key (save this securely - it won\'t be shown again):\n');
  console.log(`   ${key}`);
  console.log('\n─'.repeat(60));
  console.log('\nUsage in your application:\n');
  console.log(`   export CONTEXT_GRAPH_API_KEY="${key}"`);
  console.log('\n   or\n');
  console.log(`   cg = ContextGraph(api_key="${key}")`);
  console.log('\n' + '─'.repeat(60) + '\n');
}

// CLI Usage
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx tsx scripts/generate-api-key.ts <organization-id> <key-name> [env]');
  console.log('\nExamples:');
  console.log('  npx tsx scripts/generate-api-key.ts 00000000-0000-0000-0000-000000000001 "Production Key" live');
  console.log('  npx tsx scripts/generate-api-key.ts 00000000-0000-0000-0000-000000000001 "Development Key" test');
  process.exit(1);
}

const [organizationId, keyName, env = 'test'] = args;

createApiKey(organizationId, keyName, env as 'test' | 'live')
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to create API key:', err);
    process.exit(1);
  });
