import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Users, MapPin, UserCheck, Target, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const Stat = ({ label, value, sub, accent }) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
    <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl bg-gradient-to-br ${accent}`} />
    <div className="relative">
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">{label}</div>
      <div className="mt-2 font-display text-5xl font-bold tracking-tight text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-white/60">{sub}</div>}
    </div>
  </div>
);

export default function WarRoomPage() {
  const { settings } = useSettings();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetch = () => api.get("/war-room/live").then((r) => setData(r.data));
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="flex h-screen items-center justify-center bg-[#0B1020] text-white">Loading war room…</div>;

  const t = data.totals;
  return (
    <div className="min-h-screen bg-[#0B1020] text-white" data-testid="war-room-page">
      <div className="brand-ring fixed inset-0 -z-0 opacity-30" />
      <div className="relative z-10 mx-auto max-w-[1800px] p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
            )}
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/60">
                {settings?.party_name || "VIQSO"} · LIVE WAR ROOM
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {settings?.candidate_name ? `${settings.candidate_name} — Campaign HQ` : "Campaign Command HQ"}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs uppercase tracking-wider text-emerald-400">LIVE · Updates every 30s</span>
            </div>
            <div className="mt-1 font-mono text-xs text-white/50">
              {new Date(data.timestamp).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Mega stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <Stat label="Total Voters" value={t.voters.toLocaleString()} accent="from-blue-500 to-purple-500" />
          <Stat label="Supporters" value={t.supporters.toLocaleString()} sub={`${t.support_pct}% of base`} accent="from-emerald-500 to-teal-500" />
          <Stat label="Likely to Vote" value={t.likely_to_vote.toLocaleString()} accent="from-purple-500 to-pink-500" />
          <Stat label="Active Booths" value={t.booths} accent="from-pink-500 to-orange-500" />
          <Stat label="Today's Surveys" value={t.todays_surveys} accent="from-orange-500 to-red-500" />
          <Stat label="Support %" value={`${t.support_pct}%`} accent="from-amber-500 to-pink-500" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Top Booths */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Target className="h-4 w-4 text-emerald-400" />
              <h3 className="font-display text-lg font-bold">Top Performing Booths</h3>
            </div>
            <div className="mt-3 space-y-2">
              {data.top_booths.slice(0, 6).map((b, i) => (
                <div key={b.booth_number} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md viqso-gradient text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className="font-mono text-[10px] text-white/50">{b.booth_number} · {b.surveyed}/{b.target}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base font-bold text-emerald-400">{b.completion}%</div>
                    <div className="font-mono text-[10px] text-white/50">{b.supporters} ✓</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak Booths */}
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-5 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h3 className="font-display text-lg font-bold">Weak Booths (Action Needed)</h3>
            </div>
            <div className="mt-3 space-y-2">
              {data.weak_booths.length === 0 ? (
                <div className="py-6 text-center text-sm text-white/50">All booths above 40% — strong campaign</div>
              ) : data.weak_booths.map((b) => (
                <div key={b.booth_number} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className="font-mono text-[10px] text-white/50">{b.booth_number} · {b.ward}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base font-bold text-red-400">{b.completion}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Issues */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <h3 className="font-display text-lg font-bold">Top Voter Concerns</h3>
            </div>
            <div className="mt-3 space-y-2">
              {data.top_issues.map((i) => {
                const max = data.top_issues[0]?.count || 1;
                const pct = Math.round((i.count / max) * 100);
                return (
                  <div key={i.issue}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{i.issue}</span>
                      <span className="font-mono text-xs text-white/60">{i.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full viqso-gradient" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Activity className="h-4 w-4 text-blue-400" />
            <h3 className="font-display text-lg font-bold">Live Activity Feed</h3>
          </div>
          {data.recent_activity?.length === 0 ? (
            <div className="py-4 text-center text-sm text-white/50">No activity yet</div>
          ) : (
            <div className="mt-3 space-y-1.5">
              {data.recent_activity.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-2 text-xs">
                  <span><span className="font-semibold">{a.user_name}</span> · {a.action}</span>
                  <span className="font-mono text-white/40">{new Date(a.at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
