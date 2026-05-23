import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { createClient as createLibSQLClient } from "https://esm.sh/@libsql/client@0.5.2/web"

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const targetChannelId = body.channelId;
    const targetUserId = body.userId; // Optional: fetch for a specific user only

    const supabase = createSupabaseClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const turso = createLibSQLClient({
      url: Deno.env.get('TURSO_DATABASE_URL') || '',
      authToken: Deno.env.get('TURSO_AUTH_TOKEN') || '',
    });

    // 1. Get all users (or specific user)
    let usersQuery = supabase.from('users').select('id, youtube_key_ref');
    if (targetUserId) {
      usersQuery = usersQuery.eq('id', targetUserId);
    }
    const { data: users, error: usersErr } = await usersQuery;
    if (usersErr) throw usersErr;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No users found' }), { headers: { "Content-Type": "application/json" } });
    }

    let totalProcessed = 0;
    let totalErrors = 0;

    // 2. Loop per user
    for (const user of users) {
      const keyRef = user.youtube_key_ref;
      if (!keyRef) {
        console.log(`User ${user.id} has no API key configured, skipping`);
        continue;
      }

      // Get API key from Vault
      const { data: apiKey, error: vaultErr } = await supabase.rpc('get_secret', { secret_name: keyRef });
      if (vaultErr || !apiKey) {
        console.error(`User ${user.id}: failed to get API key from vault`);
        continue;
      }

      // Get this user's channels (or specific channel)
      let channelsQuery = supabase.from('user_channels').select('channel_id').eq('user_id', user.id);
      if (targetChannelId) {
        channelsQuery = channelsQuery.eq('channel_id', targetChannelId);
      }
      const { data: userChannels, error: ucErr } = await channelsQuery;
      if (ucErr || !userChannels || userChannels.length === 0) continue;

      // Get today's blacklisted videos for this user's channels
      const todayStart = new Date(new Date().setUTCHours(0,0,0,0)).toISOString();
      const channelIds = userChannels.map(uc => uc.channel_id);
      const { data: blacklistData } = await supabase
        .from('daily_blacklist')
        .select('video_id')
        .in('channel_id', channelIds)
        .gte('detected_at', todayStart);
      const blacklistedIds = new Set(blacklistData?.map(b => b.video_id) || []);

      // 3. Process each channel with this user's key
      for (const uc of userChannels) {
        const channelId = uc.channel_id;
        console.log(`User ${user.id} → Channel ${channelId}`);

        try {
          // Clear previous key errors for this user+channel
          await supabase.from('api_key_errors').delete().eq('user_id', user.id).eq('channel_id', channelId);

          // Fetch channel stats
          const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`);
          
          if (channelRes.status === 403) {
            // API key error → log for this user
            await supabase.from('api_key_errors').upsert({
              user_id: user.id,
              channel_id: channelId,
              error_message: 'YouTube API quota exceeded or key invalid (HTTP 403)'
            });
            totalErrors++;
            console.error(`User ${user.id}: API key error 403 for channel ${channelId}`);
            continue;
          }

          if (channelRes.status >= 500) {
            await supabase.from('api_key_errors').upsert({
              user_id: user.id,
              channel_id: channelId,
              error_message: `YouTube API server error (HTTP ${channelRes.status})`
            });
            totalErrors++;
            continue;
          }

          const channelData = await channelRes.json();
          if (!channelData.items || channelData.items.length === 0) continue;

          const channelInfo = channelData.items[0];
          const stats = channelInfo.statistics;
          const snippet = channelInfo.snippet;

          // Update channel data (shared)
          await supabase.from('channels').update({
            title: snippet.title,
            thumbnail_url: snippet.thumbnails?.default?.url || '',
            subscriber_count: parseInt(stats.subscriberCount) || 0,
            video_count: parseInt(stats.videoCount) || 0,
            view_count: parseInt(stats.viewCount) || 0,
            last_synced_at: new Date().toISOString()
          }).eq('id', channelId);

          // Fetch videos
          const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');
          const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`);
          const playlistData = await playlistRes.json();

          // Filter out blacklisted videos
          const activeItems = (playlistData.items || []).filter((item: any) => !blacklistedIds.has(item.contentDetails.videoId));
          const videoIds = activeItems.map((item: any) => item.contentDetails.videoId).join(',') || '';

          if (videoIds) {
            const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`);
            const videoData = await videoRes.json();

            for (const item of (videoData.items || [])) {
              const vSnippet = item.snippet;
              const vStats = item.statistics;

              // Upsert video to Supabase (shared)
              await supabase.from('videos').upsert({
                id: item.id,
                channel_id: channelId,
                title: vSnippet.title,
                description: vSnippet.description || '',
                tags: vSnippet.tags || [],
                published_at: vSnippet.publishedAt,
                thumbnail_url: vSnippet.thumbnails?.high?.url || ''
              });

              // Calculate VPH by comparing with previous snapshot
              const viewCount = parseInt(vStats.viewCount) || 0;
              let vph = 0;
              let baselineVph = 0;

              try {
                // Get previous snapshot
                const prevRes = await turso.execute({
                  sql: "SELECT view_count, captured_at FROM video_snapshots WHERE video_id = ? ORDER BY captured_at DESC LIMIT 1",
                  args: [item.id]
                });

                if (prevRes.rows.length > 0) {
                  const prevViews = Number(prevRes.rows[0].view_count) || 0;
                  const prevTime = new Date(prevRes.rows[0].captured_at as string).getTime();
                  const nowTime = Date.now();
                  const hoursDiff = (nowTime - prevTime) / (1000 * 60 * 60);

                  if (hoursDiff > 0 && hoursDiff < 24) {
                    vph = (viewCount - prevViews) / hoursDiff;
                  }
                }

                // Calculate baseline (average VPH from history)
                const baseRes = await turso.execute({
                  sql: "SELECT AVG(vph) as avg_vph FROM video_snapshots WHERE video_id = ? AND vph > 0",
                  args: [item.id]
                });
                baselineVph = Number(baseRes.rows[0]?.avg_vph || 0);

                // Insert snapshot with VPH
                await turso.execute({
                  sql: "INSERT INTO video_snapshots (video_id, channel_id, view_count, vph, baseline_vph, captured_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
                  args: [item.id, channelId, viewCount, Math.round(vph * 10) / 10, Math.round(baselineVph * 10) / 10]
                });
              } catch (tursoErr) {
                console.error('Turso error:', tursoErr);
              }
            }
          }

          totalProcessed++;
        } catch (channelErr) {
          console.error(`Error processing channel ${channelId} for user ${user.id}:`, channelErr);
          totalErrors++;
        }
      }
    }

    // 4. Cleanup old Turso snapshots (> 48h)
    try {
      await turso.execute("DELETE FROM video_snapshots WHERE captured_at < datetime('now', '-48 hours')");
      console.log('Cleaned up Turso snapshots older than 48 hours');
    } catch (cleanupErr) {
      console.error('Failed to cleanup Turso:', cleanupErr);
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed, errors: totalErrors }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('[hourly-tracker] fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})
