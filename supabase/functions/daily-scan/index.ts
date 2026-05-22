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

    // 1. Kiểm tra timezone của user để chỉ chạy scan cho các user đang ở 0h00
    const { data: users, error: usersErr } = await supabase.from('users').select('id, timezone');
    if (usersErr) throw usersErr;

    const validUserIds = [];
    for (const user of users) {
      const tz = user.timezone || 'UTC';
      // Lấy giờ hiện tại ở timezone của user (0-23)
      const userHour = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        hour12: false
      }).format(new Date());
      
      // '24' là 0h00 trong chuẩn hour12: false ở một số môi trường, hoặc '00'
      if (userHour === '24' || userHour === '00') {
        validUserIds.push(user.id);
      }
    }

    if (validUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No users at 0:00 right now' }), { headers: { "Content-Type": "application/json" } });
    }

    // 2. Fetch channels của các users đó
    const { data: channels, error: channelsErr } = await supabase.from('channels').select('id, user_id').in('user_id', validUserIds);
    if (channelsErr) throw channelsErr;

    const channelIds = channels.map(c => c.id);
    if (channelIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No channels for valid users' }), { headers: { "Content-Type": "application/json" } });
    }

    // 3. Fetch tất cả videos từ Supabase (metadata videos)
    const { data: videos, error: videosErr } = await supabase.from('videos').select('*').in('channel_id', channelIds);
    if (videosErr) throw videosErr;

    // 4. Lọc bỏ video published_at < 2 giờ
    const now = Date.now();
    const validVideos = videos.filter(v => {
      const hoursSincePublished = (now - new Date(v.published_at).getTime()) / (1000 * 60 * 60);
      return hoursSincePublished >= 2;
    });

    let blacklistCount = 0;

    for (const video of validVideos) {
      // 5. Lấy snapshot đầu ngày từ Turso
      const earlySnapshotRes = await turso.execute({
        sql: "SELECT view_count, captured_at FROM video_snapshots WHERE video_id = ? AND captured_at >= datetime('now', '-24 hours') ORDER BY captured_at ASC LIMIT 1",
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

      // Tính baseline per-video: Lấy trung bình VPH của video này trong 30 ngày qua (available days)
      const baselineRes = await turso.execute({
        sql: "SELECT AVG(vph) as avg_vph FROM video_snapshots WHERE video_id = ? AND vph > 0 AND captured_at >= datetime('now', '-30 days')",
        args: [video.id]
      });
      const baselineVph = Number(baselineRes.rows[0]?.avg_vph || 0);
      
      if (baselineVph === 0) continue; // Bỏ qua nếu không có đủ data baseline

      const multiplier = 3; // Default 3x. Có thể truy vấn từ bảng user settings (nếu có).
      const spikeRatio = vph / baselineVph;

      // 6. So sánh với baseline. Nếu VPH quá thấp (blacklist)
      // Chú ý: Spike là hiện tượng view tăng đột biến, nếu vph < baseline * multiplier thì bị blacklist?
      // "Video VPH < baseline * multiplier -> ghi vào daily_blacklist"
      if (vph < baselineVph * multiplier) {
        // Ghi blacklist vào Supabase
        await supabase.from('daily_blacklist').insert({
          video_id: video.id,
          channel_id: video.channel_id,
          vph_first_hour: vph,
          baseline_vph: baselineVph,
          multiplier: multiplier
        });
        blacklistCount++;
      }

      // Cập nhật lại snapshot mới nhất để lưu spike_ratio vào Turso (nếu cần)
      await turso.execute({
        sql: "UPDATE video_snapshots SET vph = ?, baseline_vph = ?, spike_ratio = ? WHERE video_id = ? AND captured_at = ?",
        args: [vph, baselineVph, spikeRatio, video.id, latest.captured_at]
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Daily scan executed', blacklisted: blacklistCount }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
