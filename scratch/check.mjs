// Usage: node --env-file=.env.local scratch/check.mjs
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!sbUrl || !sbKey) {
  console.error('Missing env vars. Run with: node --env-file=.env.local scratch/check.mjs');
  process.exit(1);
}

const supabase = createSupabaseClient(sbUrl, sbKey);

async function run() {
  const { data: uc, error: ucErr } = await supabase
    .from('user_channels')
    .select('*, channels(*)');
  console.log("All user_channels:", uc);
  if (ucErr) console.error("Error uc:", ucErr);

  const syncing = uc?.filter(row => row.channels && row.channels.title === 'Syncing...');
  console.log("User channels currently in 'Syncing...' state:", syncing);
}

run().catch(console.error);
