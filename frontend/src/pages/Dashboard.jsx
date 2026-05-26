import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Users,
  MapPin,
  UserCheck,
  Target,
  TrendingUp,
  ClipboardList,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Area, AreaChart, defs } from "recharts";

const KpiCard = ({ label, value, icon: Icon, gradient, testId, sublabel }) => (
  <div className="kpi-card group relative overflow-hidden" data-testid={testId}>
    <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20 bg-gradient-to-br ${gradient}`} />
    <div className="relative flex items-start justify-between">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </div>
        <div className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">
          {value}
        </div>
        {sublabel && <div className="mt-1 text-xs text-slate-500">{sublabel}</div>}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br ${gradient}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [boothStats, setBoothStats] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/overview"),
      api.get("/analytics/engagement-trends?days=14"),
      api.get("/analytics/booth-stats"),
    ])
      .then(([o, t, b]) => {
        setOverview(o.data);
        setTrends(t.data);
        setBoothStats(b.data);
      })
      .catch(() => {});
  }, []);

  if (!overview) {
    return <div className="text-slate-500">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1020] p-6 md:p-8">
        <div className="brand-ring absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[#0B1020]/40" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              <Sparkles className="h-3 w-3" /> Live Operations
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Command <span className="viqso-gradient-text">Center</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Real-time view of campaign coverage, voter outreach, and booth performance.
            </p>
          </div>
          <Button
            onClick={() => navigate("/survey/new")}
            className="group relative h-11 overflow-hidden rounded-lg text-white shadow-lg shadow-purple-500/30"
            data-testid="quick-new-survey-button"
          >
            <span className="absolute inset-0 viqso-gradient" />
            <span className="relative flex items-center font-semibold">
              <ClipboardList className="mr-2 h-4 w-4" />
              New Survey
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Voters Surveyed"
          value={overview.total_voters.toLocaleString()}
          icon={Users}
          gradient="from-blue-500 to-purple-500"
          testId="kpi-total-voters"
          sublabel={`of ${overview.total_target.toLocaleString()} target`}
        />
        <KpiCard
          label="Active Booths"
          value={overview.total_booths}
          icon={MapPin}
          gradient="from-purple-500 to-pink-500"
          testId="kpi-total-booths"
        />
        <KpiCard
          label="Field Workers"
          value={overview.total_workers}
          icon={UserCheck}
          gradient="from-pink-500 to-orange-500"
          testId="kpi-total-workers"
        />
        <KpiCard
          label="Completion Rate"
          value={`${overview.completion_rate}%`}
          icon={Target}
          gradient="from-orange-500 to-pink-500"
          testId="kpi-completion-rate"
          sublabel={`${overview.likely_to_vote} likely voters`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Engagement Trend */}
        <Card className="col-span-2 border-slate-200 p-6 shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">14-day Trend</div>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Voter Engagement
              </h3>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="engageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ background: "#0B1020", color: "#fff", border: "none", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#engageGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Political preferences */}
        <Card className="border-slate-200 p-6 shadow-none">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Sentiment</div>
          <h3 className="font-display text-lg font-semibold text-slate-900">
            Political Pulse
          </h3>
          <div className="mt-4 space-y-3" data-testid="preferences-breakdown">
            {Object.entries(overview.preferences).map(([k, v]) => {
              const total = Object.values(overview.preferences).reduce((a, b) => a + b, 0);
              const pct = total ? Math.round((v / total) * 100) : 0;
              const gradMap = {
                supporter: "from-emerald-500 to-teal-500",
                opposition: "from-red-500 to-pink-500",
                neutral: "from-slate-400 to-slate-500",
                undecided: "from-amber-500 to-orange-500",
                unknown: "from-slate-300 to-slate-400",
              };
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-slate-700">{k}</span>
                    <span className="font-mono text-xs text-slate-500">
                      {v} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full bg-gradient-to-r ${gradMap[k] || "from-slate-400 to-slate-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Booth performance */}
      <Card className="border-slate-200 p-6 shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Coverage</div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Booth Performance
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/booths")} data-testid="view-booths-button">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={boothStats}>
            <defs>
              <linearGradient id="surveyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#1E90FF" />
              </linearGradient>
              <linearGradient id="supportGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#F97316" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="booth_number" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip contentStyle={{ background: "#0B1020", color: "#fff", border: "none", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="target" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
            <Bar dataKey="surveyed" fill="url(#surveyGrad)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="supporters" fill="url(#supportGrad)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> Target</div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-purple-500 to-blue-500" /> Surveyed</div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-pink-500 to-orange-500" /> Supporters</div>
        </div>
      </Card>
    </div>
  );
}
