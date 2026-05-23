import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { createClient as createLibSQLClient } from "https://esm.sh/@libsql/client@0.5.2/web"

serve(async (req) => {
  try {
    console.log(`Running daily scan...`);

    const supabase = createSupabaseClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const turso = createLibSQLClient({
      url: Deno.env.get('TURSO_DATABASE_URL') || '',
      authToken: Deno.env.get('TURSO_AUTH_TOKEN') || '',
    });

    // 1. Get all users and check timezone (only run for users at midnight)
    const { data: users, error: usersErr } = await supabase.from('users').select('id, timezone');
    if (usersErr) throw usersErr;

    const validUserIds: string[] = [];
    for (const user of (users || [])) {
      const tz = user.timezone || 'UTC';
      const userHour = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        hour12: false
      }).format(new Date());
      
      if (userHour === '24' || userHour === '00') {
        validUserIds.push(user.id);
      }
    }

    if (validUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No users at 0:00 right now' }), { headers: { "Content-Type": "application/json" } });
    }

    // 2. For each valid user, get their channels via user_channels
    let blacklistCount = 0;

    for (const userId of validUserIds) {
      const { data: userChannels } = await supabase
        .from('user_channels')
        .select('channel_id')
        .eq('user_id', userId);

      if (!userChannels || userChannels.length === 0) continue;

      const channelIds = userChannels.map(uc => uc.channel_id);

      // Reset blacklist for this user's channels
      await supabase.from('daily_blacklist').delete().in('channel_id', channelIds);
      console.log(`Reset daily blacklist for user ${userId} (${channelIds.length} channels)`);

      // Check if user has key errors — skip channels with errors
      const { data: keyErrors } = await supabase
        .from('api_key_errors')
        .select('channel_id')
        .eq('user_id', userId);
      const errorChannelIds = new Set(keyErrors?.map(e => e.channel_id) || []);

      // 3. Process each channel
      for (const channelId of channelIds) {
        if (errorChannelIds.has(channelId)) {
          console.log(`Skipping channel ${channelId} for user ${userId} (key error)`);
          continue;
        }

        // Get all videos for this channel
        const { data: videos } = await supabase.from('videos').select('*').eq('channel_id', channelId);
        if (!videos || videos.length === 0) continue;

        // Filter: only videos published >= 2 hours ago
        const now = Date.now();
        const validVideos = videos.filter(v => {
          const hoursSincePublished = (now - new Date(v.published_at).getTime()) / (1000 * 60 * 60);
          return hoursSincePublished >= 2;
        });

        for (const video of validVideos) {
          // Get first hour VPH (snapshot from start of today)
          const earlySnapshotRes = await turso.execute({
            sql: "SELECT view_count, captured_at FROM video_snapshots WHERE video_id = ? AND captured_at >= date('now') ORDER BY captured_at ASC LIMIT 1",
            args: [video.id]
          });
          
          const latestSnapshotRes = await turso.execute({
            sql: "SELECT view_count, captured_at FROM video_snapshots WHERE video_id = ? ORDER BY captured_at DESC LIMIT 1",
            args: [video.id]
          });

          if (earlySnapshotRes.rows.length === 0 || latestSnapshotRes.rows.length === 0) continue;

          const early = earlySnapshotRes.rows[0];
          const latest = latestSnapshotRes.rows[0];

          const viewDiff = Number(latest.view_count) - Number(early.view_count);
          const hoursDiff = (new Date(latest.captured_at as string).getTime() - new Date(early.captured_at as string).getTime()) / (1000 * 60 * 60);
          
          const vph = hoursDiff > 0 ? viewDiff / hoursDiff : 0;

          // Baseline per-video (30 day avg)
          const baselineRes = await turso.execute({
            sql: "SELECT AVG(vph) as avg_vph FROM video_snapshots WHERE video_id = ? AND vph > 0 AND captured_at >= datetime('now', '-30 days')",
            args: [video.id]
          });
          const baselineVph = Number(baselineRes.rows[0]?.avg_vph || 0);
          
          if (baselineVph === 0) continue;

          const multiplier = 3;
          const spikeRatio = vph / baselineVph;

          // Video "bình thường" (not spiking) → blacklist
          if (vph < baselineVph * multiplier) {
            await supabase.from('daily_blacklist').insert({
              video_id: video.id,
              channel_id: video.channel_id,
              vph_first_hour: vph,
              baseline_vph: baselineVph,
              multiplier: multiplier
            });
            blacklistCount++;
          }

          // Save daily video stats (chốt ngày)
          await supabase.from('daily_video_stats').upsert({
            video_id: video.id,
            captured_date: new Date().toISOString().split('T')[0],
            view_count: Number(latest.view_count)
          });

          // Update Turso snapshot with VPH data
          await turso.execute({
            sql: "UPDATE video_snapshots SET vph = ?, baseline_vph = ?, spike_ratio = ? WHERE video_id = ? AND captured_at = ?",
            args: [vph, baselineVph, spikeRatio, video.id, latest.captured_at]
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Daily scan executed', blacklisted: blacklistCount }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
