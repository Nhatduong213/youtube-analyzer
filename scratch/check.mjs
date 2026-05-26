import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const sbUrl = 'https://xmdigxeedngotpjqwtbm.supabase.co';
const sbKey = 'sb_secret_wk87TX5R4_hIn_ep07z0ow_77fHoYE7';

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
