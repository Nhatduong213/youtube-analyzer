import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase admin client for server-side use only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const RATE_LIMIT_THRESHOLD = 100;

export async function incrementRateLimit(
  userId: string
): Promise<{ allowed: boolean; count: number }> {
  try {
    // We use a direct RPC call or postgREST to increment.
    // However, Supabase doesn't natively support ON CONFLICT via postgREST unless we have a specific RPC.
    // Let's assume we created an RPC `increment_rate_limit` in the migration, 
    // OR we use the raw SQL. Actually, using Supabase postgREST for upsert is supported if we just insert.
    // But since `count = count + 1` requires SQL, we MUST use an RPC.
    
    const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', { p_user_id: userId });
    
    if (error) {
      throw error;
    }

    const count: number = data;
    return { allowed: count <= RATE_LIMIT_THRESHOLD, count };
  } catch (error) {
    console.error('[RateLimit] DB error — failing closed', error);
    // DECISION: fail closed (block) khi DB down.
    return { allowed: false, count: -1 };
  }
}
