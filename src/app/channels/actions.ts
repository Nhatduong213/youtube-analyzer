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

  const channelId = formData.get("channelId")?.toString().trim();
  if (!channelId) {
    return { success: false, error: "Channel ID is required" };
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
    
    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
      
      const { data, error } = await adminClient.functions.invoke('hourly-tracker', {
        body: { minute: new Date().getMinutes() }
      });
      console.log('Edge function result:', data, error);
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
