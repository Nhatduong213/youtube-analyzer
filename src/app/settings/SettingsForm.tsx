"use client";

import { useState, useTransition } from "react";
import { Key, Globe, Check, AlertCircle, X } from "lucide-react";
import { saveUserSettings } from "./actions";

export default function SettingsForm() {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await saveUserSettings(formData);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      } else {
        setError(res.error || "Unknown error");
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

      {/* Inline error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0 hover:text-red-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
              Used for localized daily analytics resets
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
