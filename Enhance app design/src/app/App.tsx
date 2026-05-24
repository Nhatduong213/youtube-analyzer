import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, Tv, BarChart3, Bot, Settings as SettingsIcon,
  Users, Eye, Clock, AlertTriangle, Plus, Trash2,
  ChevronDown, Send, Zap, Key, Globe, SlidersHorizontal,
  TrendingUp, Activity, Menu, X,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { motion } from "motion/react";

// ── Context ───────────────────────────────────────────────────────────────────

type Page = "dashboard" | "channels" | "ba-analysis" | "ai-assistant" | "settings";
const NavCtx = createContext<{ setPage: (p: Page) => void }>({ setPage: () => {} });

// ── Types ─────────────────────────────────────────────────────────────────────

interface Channel {
  id: string; title: string; handle: string;
  subscribers: number; totalViews: number; videoCount: number;
  colorA: string; colorB: string; lastSynced: Date;
}
interface Video {
  id: string; channelId: string; title: string;
  views: number; vph: number; baselineVph: number;
  spikeRatio: number; publishedAt: string; thumbnail: string;
}
interface ChatMsg { role: "user" | "assistant"; content: string; }

// ── Mock Data ─────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  {
    id: "CH1", title: "MrBeast", handle: "@MrBeast",
    subscribers: 229_000_000, totalViews: 45_800_000_000, videoCount: 741,
    colorA: "#f59e0b", colorB: "#ef4444",
    lastSynced: new Date(Date.now() - 45 * 60_000),
  },
  {
    id: "CH2", title: "Linus Tech Tips", handle: "@LinusTechTips",
    subscribers: 15_400_000, totalViews: 5_200_000_000, videoCount: 5843,
    colorA: "#3b82f6", colorB: "#06b6d4",
    lastSynced: new Date(Date.now() - 42 * 60_000),
  },
  {
    id: "CH3", title: "MKBHD", handle: "@MKBHD",
    subscribers: 18_700_000, totalViews: 3_900_000_000, videoCount: 1432,
    colorA: "#ef4444", colorB: "#ec4899",
    lastSynced: new Date(Date.now() - 92 * 60_000),
  },
];

const VIDEOS: Video[] = [
  {
    id: "v1", channelId: "CH1", title: "I Built 100 Homes For 100 Families",
    views: 142_000_000, vph: 28_400, baselineVph: 8_200, spikeRatio: 3.46,
    publishedAt: "Jan 10, 2024",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&h=180&fit=crop&auto=format",
  },
  {
    id: "v2", channelId: "CH1", title: "Last To Leave Circle Wins $500,000",
    views: 89_000_000, vph: 4_180, baselineVph: 8_200, spikeRatio: 0.51,
    publishedAt: "Jan 5, 2024",
    thumbnail: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=320&h=180&fit=crop&auto=format",
  },
  {
    id: "v3", channelId: "CH2", title: "We Built the ULTIMATE Gaming PC Battlestation",
    views: 4_200_000, vph: 1_240, baselineVph: 410, spikeRatio: 3.02,
    publishedAt: "Jan 12, 2024",
    thumbnail: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=320&h=180&fit=crop&auto=format",
  },
  {
    id: "v4", channelId: "CH3", title: "The Most Expensive Phone I've Ever Reviewed",
    views: 8_900_000, vph: 2_150, baselineVph: 640, spikeRatio: 3.36,
    publishedAt: "Jan 14, 2024",
    thumbnail: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=320&h=180&fit=crop&auto=format",
  },
  {
    id: "v5", channelId: "CH3", title: "Why I Switched to Android After 10 Years",
    views: 12_400_000, vph: 900, baselineVph: 640, spikeRatio: 1.41,
    publishedAt: "Jan 8, 2024",
    thumbnail: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=320&h=180&fit=crop&auto=format",
  },
  {
    id: "v6", channelId: "CH2", title: "Does this $40 GPU Actually Game in 2024?",
    views: 2_100_000, vph: 182, baselineVph: 410, spikeRatio: 0.44,
    publishedAt: "Jan 3, 2024",
    thumbnail: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=320&h=180&fit=crop&auto=format",
  },
];

const VPH_SERIES = [
  { t: "00:00", vph: 1200 }, { t: "02:00", vph: 820 }, { t: "04:00", vph: 660 },
  { t: "06:00", vph: 1450 }, { t: "08:00", vph: 3200 }, { t: "09:00", vph: 8400 },
  { t: "10:00", vph: 12800 }, { t: "11:00", vph: 28400 }, { t: "12:00", vph: 22100 },
  { t: "13:00", vph: 18500 }, { t: "14:00", vph: 14200 }, { t: "16:00", vph: 9400 },
  { t: "18:00", vph: 6200 }, { t: "20:00", vph: 4300 }, { t: "22:00", vph: 3100 },
  { t: "23:00", vph: 2400 },
];

const AI_GREET: ChatMsg = {
  role: "assistant",
  content: "Hello! I'm your YouTube analytics AI. Ask about channel performance, revenue estimates, spike detection, or request a weekly summary.",
};
const AI_QA: [RegExp, string][] = [
  [/best|top|perform/i, "Your top performer right now is MrBeast's '100 Homes For 100 Families' with 28,400 VPH — 3.46× above baseline. Published 5 days ago, it's still in the high-engagement window. Monitor revenue projection at the 24h mark."],
  [/revenue|money|cpm|earn/i, "Conservative estimates at avg $3.5 CPM: MrBeast ~$40.4K, MKBHD ~$37.6K, LTT ~$11.1K. These use a 5% monetization rate on tracked video views — actual figures depend on audience geography and advertiser demand."],
  [/spike|blacklist/i, "2 videos are currently blacklisted: 'Last To Leave Circle' (×0.51) and LTT's '$40 GPU video' (×0.44). Both fell below 1× baseline — daily-scan will re-evaluate at midnight UTC and reset if they recover."],
  [/report|weekly|summar/i, "Weekly Summary: Jan 8–15, 2024\n• 6 videos tracked across 3 channels\n• Spiking (≥3×): 3 videos\n• Blacklisted (<1×): 2 videos\n• Peak VPH: 28,400 (MrBeast, Jan 10 11:00 UTC)\n\nHighlight: MKBHD's phone review at 3.36× baseline in a high-CPM tech niche — strong monetization signal for the next 48h."],
];

// ── Utils ─────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}
function fmtRev(views: number, cpm: number): string {
  const e = (views * 0.05 / 1e3) * cpm;
  if (e >= 1e6) return "$" + (e / 1e6).toFixed(2) + "M";
  if (e >= 1e3) return "$" + (e / 1e3).toFixed(1) + "K";
  return "$" + e.toFixed(0);
}
function relTime(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 6e4);
  if (m < 60) return m + "m ago";
  return Math.floor(m / 60) + "h ago";
}

// ── Primitives ────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function VphBadge({ vph, ratio }: { vph: number; ratio: number }) {
  const c = ratio >= 3
    ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
    : ratio >= 1
    ? "text-sky-400 bg-sky-400/10 border-sky-400/25"
    : "text-red-400 bg-red-400/10 border-red-400/25";
  return (
    <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${c}`}>
      {fmt(vph)} VPH
    </span>
  );
}

function SpikeTag({ ratio }: { ratio: number }) {
  if (ratio < 3) return null;
  return (
    <span className="inline-block text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-md">
      ×{ratio.toFixed(2)} SPIKE
    </span>
  );
}

function Ava({ ch, size = 40 }: { ch: Channel; size?: number }) {
  return (
    <div
      className="rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-white"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${ch.colorA}, ${ch.colorB})`,
        fontSize: size * 0.38,
      }}
    >
      {ch.title[0]}
    </div>
  );
}

function Stat({
  label, val, sub, Icon, accent,
}: {
  label: string; val: string; sub?: string;
  Icon: React.ComponentType<{ className?: string }>; accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-2">{label}</p>
          <p className={`text-2xl font-mono font-semibold leading-none ${accent ?? "text-white"}`}>{val}</p>
          {sub && <p className="text-[11px] font-mono text-white/25 mt-1.5">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-white/35" />
        </div>
      </div>
    </Card>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard" as Page, label: "Dashboard", Icon: LayoutDashboard },
  { id: "channels" as Page, label: "Channels", Icon: Tv },
  { id: "ba-analysis" as Page, label: "BA Analysis", Icon: BarChart3 },
  { id: "ai-assistant" as Page, label: "AI Assistant", Icon: Bot },
  { id: "settings" as Page, label: "Settings", Icon: SettingsIcon },
];

function Sidebar({
  page, setPage, col, setCol,
}: {
  page: Page; setPage: (p: Page) => void; col: boolean; setCol: (v: boolean) => void;
}) {
  return (
    <aside
      className={`flex-shrink-0 flex flex-col border-r border-white/10 transition-all duration-300 ${col ? "w-[60px]" : "w-56"}`}
      style={{ background: "oklch(0.11 0.02 258)" }}
    >
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${col ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!col && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">YT Analyzer</p>
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-wider">V14.0</p>
            </div>
            <button onClick={() => setCol(true)} className="p-1 text-white/20 hover:text-white/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {col && (
          <button onClick={() => setCol(false)} className="absolute opacity-0 pointer-events-none" aria-label="expand sidebar" />
        )}
      </div>

      {col && (
        <button
          onClick={() => setCol(false)}
          className="flex items-center justify-center py-3 text-white/25 hover:text-white/60 border-b border-white/10 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map(({ id, label, Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              title={col ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${col ? "justify-center" : ""} ${
                active
                  ? "bg-violet-600/15 text-violet-300 border border-violet-500/20"
                  : "text-white/35 hover:text-white/70 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-violet-400" : ""}`} />
              {!col && <span className="font-medium truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`p-3 border-t border-white/10 flex items-center gap-3 ${col ? "justify-center" : ""}`}>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
          U
        </div>
        {!col && (
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/50 truncate">user@example.com</p>
            <p className="text-[9px] font-mono text-white/20">Pro plan</p>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardPage() {
  const totalSubs = CHANNELS.reduce((s, c) => s + c.subscribers, 0);
  const totalViews = CHANNELS.reduce((s, c) => s + c.totalViews, 0);
  const bestSync = CHANNELS.reduce((b, c) => (c.lastSynced > b ? c.lastSynced : b), CHANNELS[0].lastSynced);
  const syncMins = Math.floor((Date.now() - bestSync.getTime()) / 6e4);
  const blacklist = VIDEOS.filter(v => v.spikeRatio < 1.0);

  const syncCls = syncMins > 90
    ? "text-red-400 border-red-500/25 bg-red-500/10"
    : syncMins > 30
    ? "text-amber-400 border-amber-500/25 bg-amber-500/10"
    : "text-emerald-400 border-emerald-500/25 bg-emerald-500/10";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">Overview · Jan 15, 2024</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border ${syncCls}`}>
          <Clock className="w-3 h-3" />
          Last sync {syncMins}m ago
          {syncMins > 30 && <AlertTriangle className="w-3 h-3" />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total Subscribers" val={fmt(totalSubs)} sub={`${CHANNELS.length} channels tracked`} Icon={Users} accent="text-violet-300" />
        <Stat label="Total Views" val={fmt(totalViews)} sub="all-time across channels" Icon={Eye} accent="text-sky-300" />
        <Stat label="Avg VPH" val="—" sub="placeholder · calculating..." Icon={Activity} accent="text-amber-300" />
      </div>

      <Card>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-white">Blacklisted Videos</h2>
          <span className="ml-auto text-[10px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded">
            {blacklist.length} today
          </span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {blacklist.length === 0 && (
            <p className="py-8 text-center text-sm font-mono text-white/20">No blacklisted videos today</p>
          )}
          {blacklist.map(v => {
            const ch = CHANNELS.find(c => c.id === v.channelId)!;
            return (
              <div key={v.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <img src={v.thumbnail} alt={v.title} className="w-20 h-12 rounded-lg object-cover flex-shrink-0 bg-white/5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/75 truncate">{v.title}</p>
                  <p className="text-[11px] font-mono text-white/25 mt-0.5">{ch.title} · {v.publishedAt}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <VphBadge vph={v.vph} ratio={v.spikeRatio} />
                  <span className="text-xs font-mono text-red-400 w-14 text-right">×{v.spikeRatio.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Channel Overview</h2>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {CHANNELS.map(ch => (
            <div key={ch.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <Ava ch={ch} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white/80">{ch.title}</p>
                <p className="text-[11px] font-mono text-white/25">{ch.handle}</p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs font-mono font-semibold text-white">{fmt(ch.subscribers)}</p>
                  <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider">subs</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-mono font-semibold text-white">{fmt(ch.totalViews)}</p>
                  <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider">views</p>
                </div>
                <div className="text-right">
                  <p className={`text-[11px] font-mono ${ch.id === "CH3" ? "text-amber-400" : "text-white/40"}`}>
                    {relTime(ch.lastSynced)}
                  </p>
                  <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider">synced</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Channels ──────────────────────────────────────────────────────────────────

function ChannelsPage() {
  const { setPage } = useContext(NavCtx);
  const [chs, setChs] = useState(CHANNELS);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!inp.trim() || loading) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setInp(""); }, 1500);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Channels</h1>
        <p className="text-xs font-mono text-white/30 mt-0.5">{chs.length} channels tracked</p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Add Channel</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            value={inp}
            onChange={e => setInp(e.target.value)}
            placeholder="Channel ID or @handle"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!inp.trim() || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {loading ? "Adding..." : "Add"}
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chs.map(ch => (
          <Card key={ch.id} className="p-5 hover:border-white/20 transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Ava ch={ch} size={44} />
                <div>
                  <p className="text-sm font-semibold text-white">{ch.title}</p>
                  <p className="text-[11px] font-mono text-white/30">{ch.handle}</p>
                </div>
              </div>
              <button
                onClick={() => setChs(cs => cs.filter(c => c.id !== ch.id))}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
              {[
                ["Subscribers", fmt(ch.subscribers)],
                ["Videos", ch.videoCount.toLocaleString()],
                ["Total Views", fmt(ch.totalViews)],
                ["Last Sync", relTime(ch.lastSynced)],
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-0.5">{lbl}</p>
                  <p className="text-xs font-mono font-semibold text-white/80">{val}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10">
              <button
                onClick={() => setPage("ba-analysis")}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-violet-400 hover:text-violet-300 hover:bg-violet-500/5 rounded-lg transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Analyze Channel
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── BA Analysis ───────────────────────────────────────────────────────────────

function BAAnalysisPage() {
  const [selCh, setSelCh] = useState(CHANNELS[0]);
  const [mainTab, setMainTab] = useState<"revenue" | "engagement" | "heatmap">("engagement");
  const [vidTab, setVidTab] = useState<"all" | "spiking" | "highvph">("all");
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const chVids = VIDEOS.filter(v => v.channelId === selCh.id);
  const spiking = chVids.filter(v => v.spikeRatio >= 3);
  const highVph = chVids.filter(v => v.vph >= 1000);
  const shown = vidTab === "all" ? chVids : vidTab === "spiking" ? spiking : highVph;
  const totalViews = chVids.reduce((s, v) => s + v.views, 0);

  const MTABS = [
    { id: "revenue" as const, label: "Revenue" },
    { id: "engagement" as const, label: "Engagement" },
    { id: "heatmap" as const, label: "Upload Heatmap" },
  ];
  const VTABS = [
    { id: "all" as const, label: "All Videos", n: chVids.length },
    { id: "spiking" as const, label: "Spiking", n: spiking.length },
    { id: "highvph" as const, label: "High VPH", n: highVph.length },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">BA Analysis</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">Business analytics · revenue estimates · VPH tracking</p>
        </div>
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setDropOpen(o => !o)}
            className="flex items-center gap-3 px-4 py-2.5 backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/20 rounded-xl transition-colors"
          >
            <Ava ch={selCh} size={28} />
            <span className="text-sm font-semibold text-white">{selCh.title}</span>
            <ChevronDown className={`w-4 h-4 text-white/35 transition-transform duration-200 ${dropOpen ? "rotate-180" : ""}`} />
          </button>
          {dropOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 backdrop-blur-2xl" style={{ background: "oklch(0.14 0.03 262)" }}>
              {CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { setSelCh(ch); setDropOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${ch.id === selCh.id ? "bg-white/5" : ""}`}
                >
                  <Ava ch={ch} size={28} />
                  <div>
                    <p className="text-sm text-white">{ch.title}</p>
                    <p className="text-[10px] font-mono text-white/30">{fmt(ch.subscribers)} subs</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {MTABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setMainTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${mainTab === id ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mainTab === "revenue" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Low CPM", cpm: 1.5, color: "text-slate-300" },
            { label: "Avg CPM", cpm: 3.5, color: "text-violet-300" },
            { label: "High CPM", cpm: 7.0, color: "text-emerald-300" },
          ].map(({ label, cpm, color }) => (
            <Card key={label} className="p-5">
              <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-1">{label} — ${cpm}</p>
              <p className={`text-2xl font-mono font-semibold mb-1 ${color}`}>{fmtRev(totalViews, cpm)}</p>
              <p className="text-[11px] font-mono text-white/25">{fmt(totalViews)} views × 5% monetized</p>
            </Card>
          ))}
        </div>
      )}

      {mainTab === "engagement" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">VPH — 24h Snapshot</h3>
              <p className="text-[11px] font-mono text-white/30 mt-0.5">Views Per Hour · spike detected at 11:00 UTC</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-amber-400/70">
                <div className="w-4 border-t border-dashed border-amber-400/60" />
                Baseline 8.2K VPH
              </div>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VPH_SERIES} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={false} interval={3}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => fmt(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10, 8, 25, 0.96)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                  itemStyle={{ color: "#a78bfa" }}
                  formatter={(v: number) => [fmt(v) + " VPH", ""]}
                />
                <ReferenceLine y={8200} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
                <Area
                  type="monotone" dataKey="vph" stroke="#8b5cf6" strokeWidth={2}
                  fill="url(#vg)" dot={false}
                  activeDot={{ r: 4, fill: "#8b5cf6", stroke: "rgba(139,92,246,0.4)", strokeWidth: 8 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {mainTab === "heatmap" && (
        <Card className="py-20 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Upload Heatmap</p>
            <p className="text-sm font-mono text-white/25 mt-1">Not yet implemented ⚠️</p>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-1 px-4 py-3.5 border-b border-white/10">
          {VTABS.map(({ id, label, n }) => (
            <button
              key={id}
              onClick={() => setVidTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${vidTab === id ? "bg-white/10 text-white" : "text-white/35 hover:text-white"}`}
            >
              {label}
              <span className={`font-mono text-[10px] ${vidTab === id ? "text-white/50" : "text-white/20"}`}>{n}</span>
            </button>
          ))}
        </div>
        <div className="divide-y divide-white/[0.05]">
          {shown.length === 0 && (
            <p className="py-8 text-center text-sm font-mono text-white/20">No videos in this filter</p>
          )}
          {shown.map(v => (
            <div key={v.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <img src={v.thumbnail} alt={v.title} className="w-24 h-14 rounded-lg object-cover flex-shrink-0 bg-white/5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/75 truncate mb-1.5">{v.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <VphBadge vph={v.vph} ratio={v.spikeRatio} />
                  <SpikeTag ratio={v.spikeRatio} />
                  <span className="text-[10px] font-mono text-white/20">{v.publishedAt}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-4">
                <p className="text-sm font-mono font-semibold text-white">{fmt(v.views)}</p>
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider mt-0.5">views</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── AI Assistant ──────────────────────────────────────────────────────────────

function AIAssistantPage() {
  const [tab, setTab] = useState<"chatbot" | "report">("chatbot");
  const [msgs, setMsgs] = useState<ChatMsg[]>([AI_GREET]);
  const [inp, setInp] = useState("");
  const [thinking, setThinking] = useState(false);
  const [repCh, setRepCh] = useState(CHANNELS[0]);
  const [repOut, setRepOut] = useState<string | null>(null);
  const [repBusy, setRepBusy] = useState(false);
  const btmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    btmRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  function send() {
    if (!inp.trim() || thinking) return;
    const q = inp.trim();
    setInp("");
    setMsgs(m => [...m, { role: "user", content: q }]);
    setThinking(true);
    const pair = AI_QA.find(([re]) => re.test(q));
    const answer = pair
      ? pair[1]
      : "I don't have specific data on that right now. Try asking about top performers, revenue estimates, spiking videos, or a weekly summary.";
    setTimeout(() => {
      setMsgs(m => [...m, { role: "assistant", content: answer }]);
      setThinking(false);
    }, 600 + Math.random() * 500);
  }

  function generateReport() {
    setRepBusy(true);
    setRepOut(null);
    setTimeout(() => {
      const vids = VIDEOS.filter(v => v.channelId === repCh.id);
      const spk = vids.filter(v => v.spikeRatio >= 3).length;
      const blk = vids.filter(v => v.spikeRatio < 1).length;
      const avgRatio = vids.length ? (vids.reduce((s, v) => s + v.spikeRatio, 0) / vids.length).toFixed(2) : "—";
      setRepOut(
        `Weekly Report — ${repCh.title}\nPeriod: Jan 8–15, 2024\n\n` +
        `CHANNEL STATS\n` +
        `  Subscribers   ${fmt(repCh.subscribers)}\n` +
        `  Total Views   ${fmt(repCh.totalViews)}\n` +
        `  Video Count   ${repCh.videoCount.toLocaleString()}\n\n` +
        `THIS WEEK\n` +
        `  Videos tracked   ${vids.length}\n` +
        `  Spiking (≥3×)    ${spk}\n` +
        `  Blacklisted (<1×) ${blk}\n` +
        `  Avg Spike Ratio  ${avgRatio}×\n\n` +
        `REVENUE ESTIMATES (5% monetization rate)\n` +
        `  Low  ($1.5 CPM)  ${fmtRev(repCh.totalViews, 1.5)}\n` +
        `  Avg  ($3.5 CPM)  ${fmtRev(repCh.totalViews, 3.5)}\n` +
        `  High ($7.0 CPM)  ${fmtRev(repCh.totalViews, 7.0)}\n\n` +
        `RECOMMENDATIONS\n` +
        `  1. Monitor spiking videos within the 24–48h revenue window\n` +
        `  2. Review blacklisted video thumbnails and titles for optimization\n` +
        `  3. Analyze upload cadence against spike pattern timing`
      );
      setRepBusy(false);
    }, 1800);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Assistant</h1>
        <p className="text-xs font-mono text-white/30 mt-0.5">Powered by Puter.js · Mock data mode</p>
      </div>

      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {(["chatbot", "report"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}
          >
            {t === "chatbot" ? "BA Chatbot" : "Weekly Report"}
          </button>
        ))}
      </div>

      {tab === "chatbot" && (
        <div
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl flex flex-col"
          style={{ height: "calc(100vh - 310px)", minHeight: 420 }}
        >
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] text-sm leading-relaxed rounded-xl px-4 py-3 whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-br-none"
                      : "bg-white/[0.06] border border-white/10 text-white/75 rounded-bl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] border border-white/10 rounded-xl rounded-bl-none px-4 py-3.5 flex gap-1.5">
                  {[0, 0.15, 0.3].map(d => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: `${d}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={btmRef} />
          </div>
          <div className="border-t border-white/10 p-4">
            <div className="flex gap-3">
              <input
                value={inp}
                onChange={e => setInp(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about performance, revenue, spikes, or weekly summary..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50 transition-colors"
              />
              <button
                onClick={send}
                disabled={!inp.trim() || thinking}
                className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-35 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "report" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-40">
                <label className="text-[10px] font-mono text-white/35 uppercase tracking-widest block mb-2">Channel</label>
                <select
                  value={repCh.id}
                  onChange={e => setRepCh(CHANNELS.find(c => c.id === e.target.value)!)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                >
                  {CHANNELS.map(ch => (
                    <option key={ch.id} value={ch.id} style={{ background: "#0a0819" }}>{ch.title}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={generateReport}
                disabled={repBusy}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                {repBusy ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </Card>

          {!repOut && !repBusy && (
            <Card className="py-16 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Zap className="w-7 h-7 text-violet-400" />
              </div>
              <p className="text-sm font-mono text-white/25">Select a channel and generate your weekly report</p>
            </Card>
          )}

          {repBusy && (
            <Card className="py-16 flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {[0, 0.15, 0.3].map(d => (
                  <div key={d} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
              <p className="text-sm font-mono text-white/30">Generating report...</p>
            </Card>
          )}

          {repOut && (
            <Card className="p-5">
              <pre className="text-xs font-mono text-white/65 whitespace-pre-wrap leading-relaxed">{repOut}</pre>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

function SettingsPage() {
  const [apiKey, setApiKey] = useState("AIzaSyBFakeKeyForDemo1234567890");
  const [tz, setTz] = useState("UTC");
  const [mult, setMult] = useState(3);
  const [saved, setSaved] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-xs font-mono text-white/30 mt-0.5">API keys, timezone & preferences</p>
      </div>

      <form onSubmit={save} className="space-y-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">YouTube API Key</h2>
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/35 uppercase tracking-widest block mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-violet-500/50 transition-colors"
            />
            <p className="text-[11px] font-mono text-white/20 mt-1.5">
              Stored encrypted in Supabase Vault — key ref: yt_key_&#123;userId&#125;
            </p>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Timezone</h2>
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/35 uppercase tracking-widest block mb-2">Timezone</label>
            <select
              value={tz}
              onChange={e => setTz(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
            >
              {[
                ["UTC", "UTC (Universal)"],
                ["America/New_York", "EST (New York)"],
                ["America/Los_Angeles", "PST (Los Angeles)"],
                ["Asia/Ho_Chi_Minh", "ICT (Ho Chi Minh)"],
              ].map(([v, l]) => (
                <option key={v} value={v} style={{ background: "#0a0819" }}>{l}</option>
              ))}
            </select>
            <p className="text-[11px] font-mono text-white/20 mt-1.5">
              Controls midnight trigger for daily-scan edge function
            </p>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Spike Multiplier</h2>
            </div>
            <span className="text-xl font-mono font-bold text-violet-400">{mult}×</span>
          </div>
          <div>
            <input
              type="range" min={2} max={10} step={0.5} value={mult}
              onChange={e => setMult(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-white/20 mt-1">
              <span>2×</span><span>10×</span>
            </div>
            <p className="text-[11px] font-mono text-amber-400/60 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              Not yet saved to DB — UI only
            </p>
          </div>
        </Card>

        <button
          type="submit"
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            saved ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
        >
          {saved ? "✓ Settings Saved" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [col, setCol] = useState(false);

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <DashboardPage />,
    channels: <ChannelsPage />,
    "ba-analysis": <BAAnalysisPage />,
    "ai-assistant": <AIAssistantPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="dark">
      <div className="min-h-screen flex overflow-hidden" style={{ background: "oklch(0.13 0.02 260)" }}>
        {/* Ambient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-48 -left-24 w-[500px] h-[500px] rounded-full bg-violet-600/[0.12] blur-3xl" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-24 w-96 h-96 rounded-full bg-indigo-500/[0.09] blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-purple-700/[0.09] blur-3xl" />
        </div>

        <NavCtx.Provider value={{ setPage }}>
          <Sidebar page={page} setPage={setPage} col={col} setCol={setCol} />
          <main className="flex-1 overflow-y-auto relative min-w-0">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {pages[page]}
            </motion.div>
          </main>
        </NavCtx.Provider>
      </div>
    </div>
  );
}
