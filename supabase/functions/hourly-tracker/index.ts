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
    let targetChannels = [];
    
    if (channelId) {
      console.log(`Direct invoke for channel: ${channelId}`);
      const { data, error: channelErr } = await supabase
        .from('channels')
        .select('id, user_id, users(youtube_key_ref)')
        .eq('id', channelId)
        .single();
        
      if (channelErr) throw channelErr;
      targetChannels = [data];
    } else {
      console.log(`Running hourly tracker for all channels at minute: ${minute}`);
      const { data: channels, error: channelErr } = await supabase
        .from('channels')
        .select('id, user_id, users(youtube_key_ref)')
        .order('created_at', { ascending: true });

      if (channelErr) throw channelErr;
      targetChannels = channels || [];
    }

    if (targetChannels.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No channels to process' }), { headers: { "Content-Type": "application/json" } });
    }

    for (const targetChannel of targetChannels) {
      try {
        const keyRef = targetChannel.users?.youtube_key_ref;
        if (!keyRef) {
          console.error(`No YouTube API key reference for user ${targetChannel.user_id}`);
          continue;
        }

        const { data: vaultData, error: vaultErr } = await supabase
          .rpc('get_secret', { secret_name: keyRef });

        if (vaultErr || !vaultData) {
          console.error(`Secret "${keyRef}" returned null or error`, vaultErr);
          continue;
        }

        const apiKey = vaultData;

        console.log(`Processing channel: ${targetChannel.id}`);

        // 1.5 Get today's blacklisted videos for this channel
        const todayStart = new Date(new Date().setUTCHours(0,0,0,0)).toISOString();
        const { data: blacklistData } = await supabase
          .from('daily_blacklist')
          .select('video_id')
          .eq('channel_id', targetChannel.id)
          .gte('detected_at', todayStart);
        
        const blacklistedIds = new Set(blacklistData?.map(b => b.video_id) || []);
        console.log(`Found ${blacklistedIds.size} blacklisted videos for today`);

    // 2. Fetch Channel Stats
    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${targetChannel.id}&key=${apiKey}`);
    const channelData = await channelRes.json();
    if (channelData.items && channelData.items.length > 0) {
      const stats = channelData.items[0].statistics;
      
      // Update Supabase channel stats
      await supabase.from('channels').update({
        title: channelData.items[0].snippet.title,
        thumbnail_url: channelData.items[0].snippet.thumbnails?.high?.url || '',
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
    
    // Filter out blacklisted videos
    const activeItems = (playlistData.items || []).filter((item: any) => !blacklistedIds.has(item.contentDetails.videoId));
    const videoIds = activeItems.map((item: any) => item.contentDetails.videoId).join(',') || '';

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
          description: snippet.description || '',
          tags: snippet.tags || [],
          published_at: snippet.publishedAt,
          thumbnail_url: snippet.thumbnails?.high?.url || ''
        });

        // Calculate VPH based on marginal view diff from last snapshot
        const lastSnap = await turso.execute({
          sql: "SELECT view_count, captured_at FROM video_snapshots WHERE video_id = ? ORDER BY captured_at DESC LIMIT 1",
          args: [item.id]
        });

        let vph = 0;
        if (lastSnap.rows.length > 0) {
          const lastViews = Number(lastSnap.rows[0].view_count);
          const lastTime = new Date(lastSnap.rows[0].captured_at as string).getTime();
          const hoursDiff = (Date.now() - lastTime) / (1000 * 60 * 60);
          const viewDiff = Number(stats.viewCount) - lastViews;
          vph = hoursDiff > 0 ? Math.max(0, viewDiff / hoursDiff) : 0;
        }

        // Insert Turso video snapshot
        await turso.execute({
          sql: "INSERT INTO video_snapshots (video_id, channel_id, view_count, like_count, comment_count, vph) VALUES (?, ?, ?, ?, ?, ?)",
          args: [item.id, targetChannel.id, stats.viewCount, stats.likeCount || 0, stats.commentCount || 0, vph]
        });
      }
    }
      } catch (err) {
        console.error(`Failed processing channel ${targetChannel.id}:`, err);
      }
    }

    // 4. Cleanup old Turso snapshots
    try {
      await turso.execute("DELETE FROM video_snapshots WHERE captured_at < datetime('now', '-48 hours')");
      console.log('Cleaned up Turso snapshots older than 48 hours');
    } catch (cleanupErr) {
      console.error('Failed to cleanup Turso:', cleanupErr);
    }

    return new Response(JSON.stringify({ success: true, message: 'Processed all channels successfully' }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error('[hourly-tracker] fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
