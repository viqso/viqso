import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Layers, Filter, Users, ArrowRight } from "lucide-react";

const GROUP_OPTIONS = [
  { value: "caste", label: "Caste" },
  { value: "religion", label: "Religion" },
  { value: "surname", label: "Surname" },
  { value: "age_group", label: "Age Group" },
  { value: "gender", label: "Gender" },
  { value: "occupation", label: "Occupation" },
  { value: "political_preference", label: "Preference" },
  { value: "sentiment", label: "Sentiment" },
  { value: "booth_id", label: "Booth" },
  { value: "ward", label: "Ward" },
];

const PREF_OPTIONS = ["all", "supporter", "neutral", "undecided", "opposition"];

export default function SegregatePage() {
  const navigate = useNavigate();
  const [groupBy, setGroupBy] = useState("caste");
  const [data, setData] = useState(null);
  const [booths, setBooths] = useState([]);
  const [filters, setFilters] = useState({ booth_id: "all", ward: "all", political_preference: "all" });

  useEffect(() => {
    api.get("/booths").then((r) => setBooths(r.data));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, v);
    });
    api.get(`/segregation/${groupBy}?${params.toString()}`).then((r) => setData(r.data));
  }, [groupBy, filters]);

  const wards = Array.from(new Set(booths.map((b) => b.ward).filter(Boolean)));

  const goVoters = (key) => {
    // Drill-down: pass filters to voters page via query
    const p = new URLSearchParams();
    if (groupBy === "political_preference") p.set("political_preference", key);
    if (groupBy === "sentiment") p.set("sentiment", key);
    navigate(`/voters?${p.toString()}`);
  };

  return (
    <div className="space-y-6" data-testid="segregate-page">
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1020] p-6 md:p-8">
        <div className="brand-ring absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[#0B1020]/40" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              <Layers className="h-3 w-3" /> Voter Segregation
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Group <span className="viqso-gradient-text">smarter.</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Slice your voter database by caste, religion, surname, family, age — combine filters to drill down.
            </p>
          </div>
        </div>
      </div>

      {/* Group selector */}
      <Card className="border-slate-200 p-4 shadow-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-2">
            <Layers className="inline h-3 w-3 mr-1" /> Group by:
          </span>
          {GROUP_OPTIONS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGroupBy(g.value)}
              data-testid={`group-by-${g.value}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                groupBy === g.value
                  ? "border-transparent text-white viqso-gradient shadow-md"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-3 w-3 text-slate-500" />
            <span className="font-semibold uppercase tracking-wider text-slate-500">Filters:</span>
          </div>
          <Select value={filters.booth_id} onValueChange={(v) => setFilters({ ...filters, booth_id: v })}>
            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Booth" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All booths</SelectItem>
              {booths.map((b) => <SelectItem key={b.id} value={b.id}>{b.booth_number} · {b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.ward} onValueChange={(v) => setFilters({ ...filters, ward: v })}>
            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Ward" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All wards</SelectItem>
              {wards.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.political_preference} onValueChange={(v) => setFilters({ ...filters, political_preference: v })}>
            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Preference" /></SelectTrigger>
            <SelectContent>
              {PREF_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p === "all" ? "All preferences" : p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Result */}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="border-slate-200 p-5 shadow-none">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Total Records</div>
              <div className="mt-1 font-display text-3xl font-bold text-slate-900">{data.total.toLocaleString()}</div>
            </Card>
            <Card className="border-slate-200 p-5 shadow-none">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Groups</div>
              <div className="mt-1 font-display text-3xl font-bold text-slate-900">{data.groups.length}</div>
            </Card>
            <Card className="border-slate-200 p-5 shadow-none">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Top Group</div>
              <div className="mt-1 font-display text-lg font-bold text-slate-900 truncate">
                {data.groups[0]?.label || "—"}
              </div>
              <div className="text-xs text-slate-500">{data.groups[0]?.count || 0} voters</div>
            </Card>
            <Card className="border-slate-200 p-5 shadow-none">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Total Supporters</div>
              <div className="mt-1 font-display text-3xl font-bold text-emerald-600">
                {data.groups.reduce((s, g) => s + g.supporters, 0).toLocaleString()}
              </div>
            </Card>
          </div>

          <Card className="border-slate-200 p-6 shadow-none">
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Distribution</div>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {GROUP_OPTIONS.find((o) => o.value === groupBy)?.label} breakdown
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.groups.slice(0, 12)}>
                <defs>
                  <linearGradient id="segGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} angle={-25} textAnchor="end" height={70} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ background: "#0B1020", color: "#fff", border: "none", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="url(#segGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="border-slate-200 p-0 shadow-none overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-display text-lg font-semibold text-slate-900">Group details</h3>
              <p className="text-xs text-slate-500">Click any row to drill into voter records</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 font-bold">Group</th>
                    <th className="px-4 py-3 font-bold text-right">Voters</th>
                    <th className="px-4 py-3 font-bold text-right">Supporters</th>
                    <th className="px-4 py-3 font-bold text-right">Opposition</th>
                    <th className="px-4 py-3 font-bold text-right">Likely Vote</th>
                    <th className="px-4 py-3 font-bold">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g, i) => {
                    const pct = data.total ? Math.round((g.count / data.total) * 100) : 0;
                    return (
                      <tr
                        key={g.key}
                        className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${i % 2 ? "bg-slate-50/30" : ""}`}
                        onClick={() => goVoters(g.key)}
                        data-testid={`group-row-${g.key}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{g.label}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{g.count}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">{g.supporters}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-700">{g.opposition}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-700">{g.likely_to_vote}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full viqso-gradient" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono text-xs text-slate-700">{pct}%</span>
                            <ArrowRight className="ml-2 h-3 w-3 text-slate-400" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
