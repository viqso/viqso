import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";

const PALETTE = ["#2563EB", "#0EA5E9", "#F59E0B", "#DC2626", "#10B981", "#8B5CF6", "#EC4899"];

const Section = ({ title, overline, children }) => (
  <Card className="border-slate-200 p-6 shadow-none">
    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{overline}</div>
    <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
    <div className="mt-4">{children}</div>
  </Card>
);

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [demographics, setDemographics] = useState(null);
  const [issues, setIssues] = useState([]);
  const [boothStats, setBoothStats] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/overview"),
      api.get("/analytics/demographics"),
      api.get("/analytics/issues"),
      api.get("/analytics/booth-stats"),
    ]).then(([o, d, i, b]) => {
      setOverview(o.data);
      setDemographics(d.data);
      setIssues(i.data.issues);
      setBoothStats(b.data);
    });
  }, []);

  if (!overview || !demographics) return <div className="text-slate-500">Loading analytics…</div>;

  const ageData = Object.entries(demographics.age_groups).map(([k, v]) => ({ name: k, value: v }));
  const genderData = Object.entries(demographics.gender).map(([k, v]) => ({ name: k, value: v }));
  const religionData = Object.entries(demographics.religion).map(([k, v]) => ({ name: k, value: v }));
  const sentData = Object.entries(overview.sentiments).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Insights</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demographics, sentiment, issues, and booth-level performance.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { k: "Total Surveyed", v: overview.total_voters.toLocaleString() },
          { k: "Completion", v: `${overview.completion_rate}%` },
          { k: "Likely Voters", v: overview.likely_to_vote.toLocaleString() },
          { k: "Supporters", v: (overview.preferences.supporter || 0).toLocaleString() },
        ].map((s) => (
          <Card key={s.k} className="border-slate-200 p-5 shadow-none">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{s.k}</div>
            <div className="mt-1 font-display text-3xl font-bold text-slate-900">{s.v}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section overline="Demographics" title="Age Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageData}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ background: "#0B1020", color: "#fff", border: "none", borderRadius: 8, fontSize: 12 }} />
              <defs>
                <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#1E90FF" />
                </linearGradient>
              </defs>
              <Bar dataKey="value" fill="url(#ageGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section overline="Demographics" title="Gender Split">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {genderData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0a1128", color: "#fff", border: "none", borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section overline="Demographics" title="Religion Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={religionData} layout="vertical">
              <CartesianGrid stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={80} />
              <Tooltip contentStyle={{ background: "#0B1020", color: "#fff", border: "none", borderRadius: 8, fontSize: 12 }} />
              <defs>
                <linearGradient id="relGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#F97316" />
                </linearGradient>
              </defs>
              <Bar dataKey="value" fill="url(#relGrad)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section overline="Sentiment" title="Voter Sentiment Mix">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={sentData} dataKey="value" nameKey="name" outerRadius={90}>
                {sentData.map((entry, i) => {
                  const color = entry.name === "positive" ? "#10B981" : entry.name === "negative" ? "#DC2626" : entry.name === "neutral" ? "#94A3B8" : "#CBD5E1";
                  return <Cell key={i} fill={color} />;
                })}
              </Pie>
              <Tooltip contentStyle={{ background: "#0a1128", color: "#fff", border: "none", borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section overline="Issues" title="Top Voter Concerns">
        <div className="space-y-2">
          {issues.map((it, i) => {
            const max = issues[0]?.count || 1;
            const pct = Math.round((it.count / max) * 100);
            return (
              <div key={it.issue}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{it.issue}</span>
                  <span className="font-mono text-xs text-slate-500">{it.count}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {issues.length === 0 && <div className="text-sm text-slate-500">No issues data yet.</div>}
        </div>
      </Section>

      <Section overline="Coverage" title="Booth-wise Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2 font-bold">Booth</th>
                <th className="py-2 font-bold">Ward</th>
                <th className="py-2 font-bold">Target</th>
                <th className="py-2 font-bold">Surveyed</th>
                <th className="py-2 font-bold">Supporters</th>
                <th className="py-2 font-bold">Completion</th>
              </tr>
            </thead>
            <tbody>
              {boothStats.map((b) => (
                <tr key={b.booth_id} className="border-b border-slate-100">
                  <td className="py-3">
                    <div className="font-medium text-slate-900">{b.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{b.booth_number}</div>
                  </td>
                  <td className="py-3 text-slate-700">{b.ward}</td>
                  <td className="py-3 font-mono text-slate-700">{b.target}</td>
                  <td className="py-3 font-mono text-slate-700">{b.surveyed}</td>
                  <td className="py-3 font-mono text-emerald-700">{b.supporters}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${b.completion >= 75 ? "bg-emerald-500" : b.completion >= 40 ? "bg-blue-600" : "bg-amber-500"}`} style={{ width: `${Math.min(100, b.completion)}%` }} />
                      </div>
                      <span className="font-mono text-xs text-slate-700">{b.completion}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
