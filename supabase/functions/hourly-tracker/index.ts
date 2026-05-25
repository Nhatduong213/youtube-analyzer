import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { createClient as createLibSQLClient } from "https://esm.sh/@libsql/client@0.5.2/web"

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

function nextYouTubeReset(): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setUTCHours(7, 5, 0, 0);
  if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 1);
  return candidate;
}

function parseDurationSeconds(iso: string | null): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+(m[1]||0))*3600 + (+(m[2]||0))*60 + (+(m[3]||0));
}

const safeInt = (v: any): number => Number.isFinite(+(v ?? NaN)) ? +v : 0;

async function fetchVideoDetails(videoIds: string[], apiKey: string) {
  const CHUNK = 50;
  const results: any[] = [];
  for (let i = 0; i < videoIds.length; i += CHUNK) {
    const chunk = videoIds.slice(i, i + CHUNK);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos` +
        `?part=statistics,snippet,contentDetails` +
        `&id=${chunk.join(',')}&key=${apiKey}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (!res.ok) { console.error(`[yt-api] HTTP ${res.status} chunk ${i/50}`); continue; }
      const data = await res.json();
      if (data.error) {
        console.error(`[yt-api] error chunk ${i/50}:`, data.error.message);
        if (data.error.code === 403) throw new Error('QuotaExceeded');
        continue;
      }
      results.push(...(data.items ?? []));
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') { console.error(`[yt-api] timeout chunk ${i/50}`); continue; }
      throw err;
    }
  }
  return results;
}

async function processAllChannels(body: any) {
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

  const { data: locked } = await supabase.rpc('try_claim_tracker_lock');
  if (!locked) { console.log('[tracker] already running, skip'); return; }

  try {
    // Check quota state
    const { data: qf } = await supabase
      .from('system_flags').select('value').eq('key','yt_quota_reset').single();
    if (qf?.value && new Date(qf.value) > new Date()) {
      console.log('[tracker] quota exhausted until', qf.value); return;
    }

    // 1. Get all users (or specific user)
    let usersQuery = supabase.from('users').select('id, youtube_key_ref');
    if (targetUserId) {
      usersQuery = usersQuery.eq('id', targetUserId);
    }
    const { data: users, error: usersErr } = await usersQuery;
    if (usersErr) throw usersErr;
    if (!users || users.length === 0) {
      console.log('[tracker] No users found');
      return;
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
            throw new Error('QuotaExceeded');
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
          const videoIdsList = activeItems.map((item: any) => item.contentDetails.videoId) || [];

          if (videoIdsList.length > 0) {
            const videoItems = await fetchVideoDetails(videoIdsList, apiKey);

            for (const item of videoItems) {
              const vSnippet = item.snippet;
              const vStats = item.statistics;

              // Detect Shorts
              const duration = item.contentDetails?.duration || null;
              const durationSecs = parseDurationSeconds(duration);
              const SHORTS_MAX = 180;
              const isDurationShort = durationSecs > 0 && durationSecs <= SHORTS_MAX;
              const isTitleShort = durationSecs === 0 && /#shorts?\b/i.test(vSnippet.title ?? '');
              const isShort = isDurationShort || isTitleShort;

              // Upsert video to Supabase (shared)
              const { error: upsertErr } = await supabase.from('videos').upsert({
                id: item.id,
                channel_id: channelId,
                title: vSnippet.title,
                description: vSnippet.description || '',
                tags: vSnippet.tags || [],
                published_at: vSnippet.publishedAt,
                thumbnail_url: vSnippet.thumbnails?.high?.url || vSnippet.thumbnails?.medium?.url || vSnippet.thumbnails?.default?.url || '',
                like_count: safeInt(vStats?.likeCount),
                comment_count: safeInt(vStats?.commentCount),
                view_count: safeInt(vStats?.viewCount),
                duration,
                is_short: isShort
              }, { onConflict: 'id' });
              if (upsertErr) console.error(`[upsert] ${item.id}:`, upsertErr.message);

              // Calculate VPH by comparing with previous snapshot
              const viewCount = safeInt(vStats?.viewCount);
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
                  vph = viewCount - prevViews;
                  if (vph < 0) vph = 0;
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
                  args: [item.id, channelId, viewCount, vph, Math.round(baselineVph)]
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
          if ((channelErr as any).message === 'QuotaExceeded') throw channelErr;
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

    console.log(`[hourly-tracker] done: processed=${totalProcessed}, errors=${totalErrors}`);
  } catch (err: any) {
    if (err.message === 'QuotaExceeded') {
      const reset = nextYouTubeReset();
      await supabase.from('system_flags')
        .upsert({ key: 'yt_quota_reset', value: reset.toISOString() });
      console.error('[tracker] quota exhausted until', reset.toISOString());
    } else { throw err; }
  } finally {
    try {
      await supabase.rpc('release_tracker_lock');
    } catch (e) {
      console.error('Failed to release tracker lock:', e);
    }
  }
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  EdgeRuntime.waitUntil(
    processAllChannels(body).catch(err => console.error('[hourly-tracker] fatal:', err))
  );

  return new Response(
    JSON.stringify({ status: 'accepted', time: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' }, status: 202 }
  );
});
