import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, Plus, Filter } from "lucide-react";

const PREF_COLORS = {
  supporter: "bg-emerald-50 text-emerald-700 border-emerald-200",
  opposition: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-50 text-slate-600 border-slate-200",
  undecided: "bg-amber-50 text-amber-700 border-amber-200",
};

const SENT_COLORS = {
  positive: "bg-emerald-100 text-emerald-700",
  negative: "bg-red-100 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

export default function VotersPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [voters, setVoters] = useState([]);
  const [search, setSearch] = useState("");
  const [pref, setPref] = useState(params.get("political_preference") || "all");
  const [sent, setSent] = useState(params.get("sentiment") || "all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (pref !== "all") params.set("political_preference", pref);
    if (sent !== "all") params.set("sentiment", sent);
    const { data } = await api.get(`/voters?${params.toString()}`);
    setVoters(data);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search, pref, sent]);

  return (
    <div className="space-y-6" data-testid="voters-page">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Database</div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Voters
          </h1>
          <p className="mt-1 text-sm text-slate-500">{voters.length} records · live search & filter</p>
        </div>
        <Button
          onClick={() => navigate("/survey/new")}
          className="bg-blue-600 text-white hover:bg-blue-700"
          data-testid="add-voter-button"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Survey
        </Button>
      </div>

      <Card className="border-slate-200 p-4 shadow-none">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, voter ID, or phone…"
              className="pl-9"
              data-testid="voters-search-input"
            />
          </div>
          <Select value={pref} onValueChange={setPref}>
            <SelectTrigger className="w-full md:w-[180px]" data-testid="filter-preference">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All preferences</SelectItem>
              <SelectItem value="supporter">Supporter</SelectItem>
              <SelectItem value="opposition">Opposition</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="undecided">Undecided</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sent} onValueChange={setSent}>
            <SelectTrigger className="w-full md:w-[180px]" data-testid="filter-sentiment">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sentiments</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-200 p-0 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="voters-table">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">Voter</th>
                <th className="px-4 py-3 font-bold">Age/Gender</th>
                <th className="px-4 py-3 font-bold">Preference</th>
                <th className="px-4 py-3 font-bold">Sentiment</th>
                <th className="px-4 py-3 font-bold">Issues</th>
                <th className="px-4 py-3 font-bold">Surveyed</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
              ) : voters.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No voters found.</td></tr>
              ) : voters.map((v, idx) => (
                <tr
                  key={v.id}
                  className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${idx % 2 ? "bg-slate-50/30" : ""}`}
                  onClick={() => navigate(`/survey/${v.id}/edit`)}
                  data-testid={`voter-row-${v.id}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{v.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{v.voter_id_number}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {v.age || "—"} <span className="text-slate-400">·</span> <span className="capitalize">{v.gender || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    {v.political_preference ? (
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${PREF_COLORS[v.political_preference] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {v.political_preference}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {v.sentiment ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${SENT_COLORS[v.sentiment] || "bg-slate-100 text-slate-600"}`}>
                        {v.sentiment}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {(v.issues || []).slice(0, 2).join(", ") || "—"}
                    {v.issues?.length > 2 && <span className="text-slate-400"> +{v.issues.length - 2}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {v.surveyed_at ? new Date(v.surveyed_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
