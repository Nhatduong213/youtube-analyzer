"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

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
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      const { data: session } = await ssrClient.auth.getSession();
      await fetch(`${supabaseUrl}/functions/v1/hourly-tracker`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.session?.access_token || anonKey}`,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (err) {
    console.error("Failed to trigger edge function", err);
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
