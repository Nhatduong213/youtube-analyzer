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
      
      const delay = (attempt: number): number => {
        const base = 100 * Math.pow(2, attempt);
        return base + Math.random() * base * 0.3; // jitter ±30%
      };

      const saveSecretWithRetry = async (maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const { error: rpcError } = await ssrClient.rpc('save_user_secret', {
            secret_name: ref,
            secret_value: apiKey
          });
          
          if (rpcError) {
            if (rpcError.message?.includes('ERR_SECRET_UPDATE_IN_PROGRESS') && attempt < maxRetries - 1) {
              await new Promise(r => setTimeout(r, delay(attempt)));
              continue;
            }
            throw new Error(`Failed to save secret to vault: ${rpcError.message}`);
          }
          return;
        }
        throw new Error('Secret update temporarily unavailable');
      };

      await saveSecretWithRetry();

      // 2. Cập nhật reference vào bảng users
      const { error: updateError } = await ssrClient
        .from('users')
        .upsert({ 
          id: userId,
          youtube_key_ref: ref,
          timezone: timezone || 'UTC'
        });

      if (updateError) {
        throw new Error(`Failed to update user profile: ${updateError.message}`);
      }
    } else {
      // Nếu không nhập API Key, chỉ update timezone
      const { error: updateError } = await ssrClient
        .from('users')
        .upsert({
          id: userId,
          timezone: timezone || 'UTC'
        });

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
