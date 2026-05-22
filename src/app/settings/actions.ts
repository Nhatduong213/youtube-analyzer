"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function saveUserSettings(formData: FormData) {
  const ssrClient = await createClient();
  const { data: { user } } = await ssrClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }
  
  const userId = user.id;

  const apiKey = formData.get("apiKey")?.toString();
  const timezone = formData.get("timezone")?.toString();
  const spikeMultiplier = formData.get("spikeMultiplier")?.toString(); // Hiện tại có thể chưa lưu vào DB

  try {
    // 1. Lưu API Key vào Vault (nếu user có nhập)
    if (apiKey) {
      const ref = `yt_key_${userId}`;
      
      const { error: rpcError } = await ssrClient.rpc('create_secret', {
        new_secret: apiKey,
        new_name: ref
      }, { head: false });

      if (rpcError) {
        throw new Error(`Failed to save secret to vault: ${rpcError.message}`);
      }

      // 2. Cập nhật reference vào bảng users
      const { error: updateError } = await ssrClient
        .from('users')
        .update({ 
          youtube_key_ref: ref,
          timezone: timezone || 'UTC'
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to update user profile: ${updateError.message}`);
      }
    } else {
      // Nếu không nhập API Key, chỉ update timezone
      const { error: updateError } = await ssrClient
        .from('users')
        .update({ timezone: timezone || 'UTC' })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to update timezone: ${updateError.message}`);
      }
    }

    revalidatePath("/settings");
    return { success: true, message: "Settings saved successfully" };
  } catch (error: any) {
    console.error("Error saving settings:", error);
    return { success: false, error: error.message };
  }
}
