"use client";

import { useState, useTransition } from "react";
import { Key, Globe, SlidersHorizontal, AlertTriangle, Check } from "lucide-react";
import { saveUserSettings } from "./actions";

export default function SettingsForm() {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [mult, setMult] = useState(3);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await saveUserSettings(formData);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      } else {
        alert("Failed to save settings: " + res.error);
      }
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-xs font-mono text-white/30 mt-0.5">
          API keys, timezone &amp; preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── YouTube API Key ────────────────────────────────── */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">YouTube API Key</h2>
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/35 uppercase tracking-widest block mb-2">
              API Key
            </label>
            <input
              type="password"
              name="apiKey"
              placeholder="AIzaSy... (Leave blank to keep current)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-violet-500/50 transition-colors"
            />
            <p className="text-[11px] font-mono text-white/20 mt-1.5">
              Stored encrypted in Supabase Vault — key ref: yt_key_&#123;userId&#125;
            </p>
          </div>
        </div>

        {/* ── Timezone ───────────────────────────────────────── */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Timezone</h2>
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/35 uppercase tracking-widest block mb-2">
              Timezone
            </label>
            <select
              name="timezone"
              defaultValue="Asia/Ho_Chi_Minh"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer focus:border-violet-500/50 transition-colors"
            >
              <option value="UTC" style={{ background: "#0a0819" }}>
                UTC (Universal)
              </option>
              <option value="America/New_York" style={{ background: "#0a0819" }}>
                EST (New York)
              </option>
              <option value="America/Los_Angeles" style={{ background: "#0a0819" }}>
                PST (Los Angeles)
              </option>
              <option value="Asia/Ho_Chi_Minh" style={{ background: "#0a0819" }}>
                ICT (Ho Chi Minh)
              </option>
              <option value="Europe/London" style={{ background: "#0a0819" }}>
                GMT (London)
              </option>
            </select>
            <p className="text-[11px] font-mono text-white/20 mt-1.5">
              Controls midnight trigger for daily-scan edge function
            </p>
          </div>
        </div>

        {/* ── Spike Multiplier ───────────────────────────────── */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Spike Multiplier</h2>
            </div>
            <span className="text-xl font-mono font-bold text-violet-400">{mult}×</span>
          </div>
          <div>
            <input
              type="range"
              name="spikeMultiplier"
              min={2}
              max={10}
              step={0.5}
              value={mult}
              onChange={(e) => setMult(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-white/20 mt-1">
              <span>2×</span>
              <span>10×</span>
            </div>
            <p className="text-[11px] font-mono text-amber-400/60 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              Not yet saved to DB — UI only
            </p>
          </div>
        </div>

        {/* ── Save Button ────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isPending}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            saved
              ? "bg-emerald-600 text-white"
              : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Settings Saved
            </>
          ) : isPending ? (
            "Saving..."
          ) : (
            "Save Settings"
          )}
        </button>
      </form>
    </div>
  );
}
