"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function extractChannelIdOrHandle(input: string): { type: 'id' | 'handle'; value: string } | null {
  let val = input.trim();
  
  if (val.includes('youtube.com') || val.includes('youtu.be')) {
    try {
      const urlString = val.startsWith('http') ? val : `https://${val}`;
      const url = new URL(urlString);
      const path = url.pathname;
      
      // 1. Matches: /@handle
      const handleMatch = path.match(/^\/(@[A-Za-z0-9_\-\.]+)/);
      if (handleMatch) {
        return { type: 'handle', value: handleMatch[1] };
      }
      
      // 2. Matches: /channel/UC...
      const idMatch = path.match(/^\/channel\/(UC[A-Za-z0-9_\-]{22})/);
      if (idMatch) {
        return { type: 'id', value: idMatch[1] };
      }
      
      // 3. Matches: /c/name or /user/name
      const cMatch = path.match(/^\/(?:c|user)\/([A-Za-z0-9_\-\.]+)/);
      if (cMatch) {
        return { type: 'handle', value: `@${cMatch[1]}` };
      }
      
      const segments = path.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last) {
        if (last.startsWith('@')) {
          return { type: 'handle', value: last };
        }
        if (last.startsWith('UC') && last.length === 24) {
          return { type: 'id', value: last };
        }
      }
    } catch (e) {
      // ignore and treat as raw text
    }
  }
  
  if (val.startsWith('@')) {
    return { type: 'handle', value: val };
  }
  if (val.startsWith('UC') && val.length === 24) {
    return { type: 'id', value: val };
  }
  
  return { type: 'handle', value: `@${val}` };
}

export async function triggerSyncingFailsafe() {
  try {
    const ssrClient = await createClient();
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return;

    const { data: userChannels } = await ssrClient
      .from('user_channels')
      .select('channels(id, title)')
      .eq('user_id', user.id);

    const syncingChannels = userChannels
      ?.map((uc: any) => uc.channels)
      .filter((ch: any) => ch && ch.title === 'Syncing...') || [];

    if (syncingChannels.length === 0) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey && supabaseUrl) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
      for (const ch of syncingChannels) {
        console.log(`Failsafe: re-triggering sync for channel ${ch.id}`);
        adminClient.functions.invoke('hourly-tracker', {
          body: { channelId: ch.id, userId: user.id }
        }).catch(err => console.error('Failsafe sync invoke failed:', err));
      }
    }
  } catch (err) {
    console.error('Failsafe execution failed:', err);
  }
}

export async function addChannel(formData: FormData) {
  const ssrClient = await createClient();
  const { data: { user } } = await ssrClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const rawInput = formData.get("channelId")?.toString().trim();
  if (!rawInput) {
    return { success: false, error: "Channel link or ID is required" };
  }

  const parsed = extractChannelIdOrHandle(rawInput);
  if (!parsed) {
    return { success: false, error: "Invalid channel link or ID format" };
  }

  // Lấy API key từ Vault
  const { data: userData } = await ssrClient.from('users').select('youtube_key_ref').eq('id', user.id).single();
  const keyRef = userData?.youtube_key_ref;
  if (!keyRef) return { success: false, error: "Please configure your YouTube API Key in Settings first." };

  const { data: apiKey, error: vaultErr } = await ssrClient.rpc('get_secret', { secret_name: keyRef });
  if (vaultErr || !apiKey) return { success: false, error: "Failed to retrieve API key." };

  let channelId = parsed.value;

  if (parsed.type === 'handle') {
    const handle = parsed.value.substring(1);
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`);
    
    if (response.status === 403) return { success: false, error: 'YouTube API quota exceeded' };
    if (response.status >= 500) return { success: false, error: `YouTube API error: ${response.status}` };
    
    const data = await response.json();
    if (!data.items?.length) return { success: false, error: `Handle not found: ${parsed.value}` };
    
    channelId = data.items[0].id;
  }

  // 1. Upsert channel (shared, no user_id)
  const { error: channelErr } = await ssrClient
    .from("channels")
    .upsert({ id: channelId, title: "Syncing..." }, { onConflict: 'id', ignoreDuplicates: true });

  if (channelErr) {
    return { success: false, error: channelErr.message };
  }

  // 2. Link user <-> channel
  const { error: linkErr } = await ssrClient
    .from("user_channels")
    .insert({ user_id: user.id, channel_id: channelId });

  if (linkErr) {
    if (linkErr.code === '23505' || linkErr.message.includes('duplicate key')) {
      return { success: false, error: "Bạn đã follow kênh này rồi." };
    }
    return { success: false, error: linkErr.message };
  }

  // 3. Clear any previous API key errors for this user+channel
  await ssrClient.from("api_key_errors").delete().eq("user_id", user.id).eq("channel_id", channelId);

  // 4. Trigger edge function immediately to fetch real data
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (serviceRoleKey && supabaseUrl) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
      
      const { error } = await adminClient.functions.invoke('hourly-tracker', {
        body: { channelId, userId: user.id }
      });
      
      if (error) {
        console.error('Edge function error:', error.message);
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

  // Chỉ xoá link user <-> channel, KHÔNG xoá channel gốc
  const { error } = await ssrClient
    .from("user_channels")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Xoá luôn api_key_errors
  await ssrClient.from("api_key_errors").delete().eq("user_id", user.id).eq("channel_id", channelId);

  revalidatePath("/");
  revalidatePath("/channels");
  revalidatePath("/ba-analysis");
  return { success: true };
}
