import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { createClient as createLibSQLClient } from "https://esm.sh/@libsql/client@0.5.2/web"

serve(async (req) => {
  try {
    const { minute, channelId } = await req.json();

    const supabase = createSupabaseClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const turso = createLibSQLClient({
      url: Deno.env.get('TURSO_DATABASE_URL') || '',
      authToken: Deno.env.get('TURSO_AUTH_TOKEN') || '',
    });

    // 1. Target resolution
    let targetChannel;
    
    if (channelId) {
      console.log(`Direct invoke for channel: ${channelId}`);
      const { data, error: channelErr } = await supabase
        .from('channels')
        .select('id, user_id, users(youtube_key_ref)')
        .eq('id', channelId)
        .single();
        
      if (channelErr) throw channelErr;
      targetChannel = data;
    } else {
      console.log(`Running hourly tracker for minute: ${minute}`);
      // Stagger logic
      const { data: channels, error: channelErr } = await supabase
        .from('channels')
        .select('id, user_id, users(youtube_key_ref)')
        .order('created_at', { ascending: true });

      if (channelErr) throw channelErr;

      const channelIndex = Math.floor(minute / 2);
      targetChannel = channels && channels.length > channelIndex ? channels[channelIndex] : null;

      if (!targetChannel) {
        return new Response(JSON.stringify({ success: true, message: 'No channel at this index' }), { headers: { "Content-Type": "application/json" } });
      }
    }

    const keyRef = targetChannel.users?.youtube_key_ref;
    if (!keyRef) {
      throw new Error(`No YouTube API key reference for user ${targetChannel.user_id}`);
    }

    const { data: vaultData, error: vaultErr } = await supabase
      .rpc('get_secret', { secret_name: keyRef });

    if (vaultErr) throw vaultErr;
    if (!vaultData) throw new Error(`Secret "${keyRef}" returned null`);

    const apiKey = vaultData;

    console.log(`Processing channel: ${targetChannel.id}`);

    // 2. Fetch Channel Stats
    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${targetChannel.id}&key=${apiKey}`);
    const channelData = await channelRes.json();
    if (channelData.items && channelData.items.length > 0) {
      const stats = channelData.items[0].statistics;
      
      // Update Supabase channel stats
      await supabase.from('channels').update({
        subscriber_count: stats.subscriberCount,
        video_count: stats.videoCount,
        view_count: stats.viewCount,
        last_synced_at: new Date().toISOString()
      }).eq('id', targetChannel.id);

      // Insert Turso channel snapshot
      await turso.execute({
        sql: "INSERT INTO channel_snapshots (channel_id, subscriber_count, video_count, view_count) VALUES (?, ?, ?, ?)",
        args: [targetChannel.id, stats.subscriberCount, stats.videoCount, stats.viewCount]
      });
    }

    // 3. Fetch Recent Videos Stats (Max 50 videos for performance in Edge Fn)
    // Thay search bằng playlistItems để tiết kiệm quota (1 unit thay vì 100 units/call)
    const uploadsPlaylistId = targetChannel.id.replace(/^UC/, 'UU');
    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`);
    const playlistData = await playlistRes.json();
    const videoIds = playlistData.items?.map((item: any) => item.contentDetails.videoId).join(',') || '';

    if (videoIds) {
      const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`);
      const videoData = await videoRes.json();
      
      for (const item of videoData.items || []) {
        const stats = item.statistics;
        const snippet = item.snippet;
        
        // Upsert video to Supabase
        await supabase.from('videos').upsert({
          id: item.id,
          channel_id: targetChannel.id,
          title: snippet.title,
          published_at: snippet.publishedAt,
          thumbnail_url: snippet.thumbnails?.high?.url || ''
        });

        // Calculate VPH - simple calc for snapshot (advanced calc in daily scan)
        const hoursSincePublished = (Date.now() - new Date(snippet.publishedAt).getTime()) / (1000 * 60 * 60);
        const vph = hoursSincePublished > 0 ? Number(stats.viewCount) / hoursSincePublished : 0;

        // Insert Turso video snapshot
        await turso.execute({
          sql: "INSERT INTO video_snapshots (video_id, channel_id, view_count, like_count, comment_count, vph) VALUES (?, ?, ?, ?, ?, ?)",
          args: [item.id, targetChannel.id, stats.viewCount, stats.likeCount || 0, stats.commentCount || 0, vph]
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Processed channel successfully' }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error('[hourly-tracker] fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
