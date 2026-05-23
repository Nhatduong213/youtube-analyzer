import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ChannelsClient from "./ChannelsClient";

export const dynamic = 'force-dynamic';

export default async function ChannelsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Query through user_channels junction table
  const { data: userChannels } = await supabase
    .from("user_channels")
    .select("channels(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Flatten: extract channels from nested structure
  const channels = userChannels?.map((uc: any) => uc.channels).filter(Boolean) || [];

  return <ChannelsClient initialChannels={channels} />;
}
