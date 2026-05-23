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

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return <ChannelsClient initialChannels={channels || []} />;
}
