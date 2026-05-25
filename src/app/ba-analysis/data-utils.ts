// ── Cross-DB Merge Pattern ────────────────────────────────────
// Turso (time-series) + Supabase (metadata) = 2 DBs, NO SQL JOIN.
// Pattern: Turso query → extract IDs → Supabase .in() batch → Map merge

export interface MergedVideo {
  video_id: string;
  title: string;
  published_at: string;
  thumbnail_url: string;
  view_count: number;
  vph: number;
  baseline_vph: number;
  spike_ratio: number;
  captured_at: string;
  like_count: number;
  comment_count: number;
  duration: string | null;
  is_short: boolean;
}

interface TursoSnapshotRow {
  video_id: string;
  vph: number;
  baseline_vph: number;
  view_count: number;
  captured_at: string;
}

interface SupabaseVideo {
  id: string;
  title: string;
  published_at: string;
  thumbnail_url: string;
  like_count: number;
  comment_count: number;
  duration: string | null;
  is_short: boolean;
}

export function mergeVideoData(
  tursoRows: TursoSnapshotRow[],
  supabaseVideos: SupabaseVideo[]
): MergedVideo[] {
  const videoMap = new Map(supabaseVideos.map(v => [v.id, v]));

  return tursoRows.map(row => {
    const v = videoMap.get(row.video_id);
    const vph = Number(row.vph) || 0;
    const baseline = Number(row.baseline_vph) || 0;
    const spike_ratio = baseline > 0 ? vph / baseline : 0;

    return {
      video_id: row.video_id,
      title: v?.title || 'Unknown Video',
      published_at: v?.published_at || new Date().toISOString(),
      thumbnail_url: v?.thumbnail_url || '',
      view_count: Number(row.view_count) || 0,
      vph,
      baseline_vph: baseline,
      spike_ratio,
      captured_at: row.captured_at as string,
      like_count: v?.like_count || 0,
      comment_count: v?.comment_count || 0,
      duration: v?.duration || null,
      is_short: v?.is_short || false,
    };
  });
}

// ── Latest Snapshots SQL (shared by Top Performer + Video List) ──
// Uses ROW_NUMBER() confirmed working on libSQL/Turso
// -4 hour window: resilient to 1-2 missed tracker runs
// vph IS NOT NULL inside inner query to leverage partial index
export const LATEST_SNAPSHOTS_SQL = `
SELECT s.video_id, s.vph, s.baseline_vph, s.view_count, s.captured_at
FROM (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY video_id ORDER BY captured_at DESC
    ) AS rn
  FROM video_snapshots
  WHERE channel_id = ?
    AND captured_at >= datetime('now', '-4 hours')
    AND vph IS NOT NULL
) AS s
WHERE s.rn = 1
ORDER BY s.vph DESC;
`;

// ── VPH Chart SQL ──
// SUM(vph) = total channel VPH across all active videos
// Label in UI: "Channel VPH (all active videos)"
export const VPH_CHART_SQL = `
SELECT
  strftime('%Y-%m-%dT%H:00:00', captured_at) AS hour,
  SUM(vph) AS total_vph,
  COUNT(DISTINCT video_id) AS video_count
FROM video_snapshots
WHERE channel_id = ?
  AND captured_at >= datetime('now', '-48 hours')
GROUP BY hour
ORDER BY hour;
`;

// ── ISO 8601 Duration Parser ──
// "PT1H23M45S" → "1:23:45"
// "PT12M34S"   → "12:34"
// "PT45S"      → "0:45"
// "PT"         → "—"
// null         → "—"
export function parseDuration(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "—";
  const [, h, min, s] = m;
  const total = (+(h || 0)) * 3600 + (+(min || 0)) * 60 + (+(s || 0));
  if (total === 0) return "—";
  const parts: string[] = [];
  if (h) parts.push(h);
  parts.push((min || "0").padStart(h ? 2 : 1, "0"));
  parts.push((s || "0").padStart(2, "0"));
  return parts.join(":");
}

// ── Format number compact ──
export function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

// ── Format timestamp to browser timezone ──
export function formatLocalTime(utcStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  }).format(new Date(utcStr));
}

// ── Channel ID Validation ──
export const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
export function safeChannelId(raw: string | null | undefined): string | null {
  return raw && CHANNEL_ID_RE.test(raw) ? raw : null;
}
