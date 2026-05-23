"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function addChannel(formData: FormData) {
  const ssrClient = await createClient();
  const { data: { user } } = await ssrClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  let channelId = formData.get("channelId")?.toString().trim();
  if (!channelId) {
    return { success: false, error: "Channel ID is required" };
  }

  // Lấy API key từ Vault
  const { data: userData } = await ssrClient.from('users').select('youtube_key_ref').eq('id', user.id).single();
  const keyRef = userData?.youtube_key_ref;
  if (!keyRef) return { success: false, error: "Please configure your YouTube API Key in Settings first." };

  const { data: apiKey, error: vaultErr } = await ssrClient.rpc('get_secret', { secret_name: keyRef });
  if (vaultErr || !apiKey) return { success: false, error: "Failed to retrieve API key." };

  if (channelId.startsWith('@')) {
    const handle = channelId.substring(1);
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`);
    
    if (response.status === 403) return { success: false, error: 'YouTube API quota exceeded' };
    if (response.status >= 500) return { success: false, error: `YouTube API error: ${response.status}` };
    
    const data = await response.json();
    if (!data.items?.length) return { success: false, error: `Handle not found: ${channelId}` };
    
    channelId = data.items[0].id;
  }

  // Insert dummy channel
  const { error } = await ssrClient
    .from("channels")
    .insert({
      id: channelId,
      user_id: user.id,
      title: "Syncing...", // Temporary title
    });

  if (error) {
    return { success: false, error: error.message };
  }

  // Trigger edge function immediately to fetch real data
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('Service role key exists:', !!serviceRoleKey);
    console.log('Supabase URL:', supabaseUrl);
    
    if (!serviceRoleKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    } else if (supabaseUrl) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
      
      const { data, error } = await adminClient.functions.invoke('hourly-tracker', {
        body: { channelId }
      });
      
      if (error) {
        console.error('Edge function error:', error.message, (error as any).context?.status);
      } else {
        console.log('Edge function ok:', data);
      }
    }
  } catch (err) {
    console.error('Edge function threw:', err);
  }

  revalidatePath("/");
  revalidatePath("/channels");
  revalidatePath("/ba-analysis");
  
  return { success: true, channelId };
}

export async function deleteChannel(channelId: string) {
  const ssrClient = await createClient();
  const { data: { user } } = await ssrClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await ssrClient
    .from("channels")
    .delete()
    .eq("id", channelId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/channels");
  revalidatePath("/ba-analysis");
  return { success: true };
}
