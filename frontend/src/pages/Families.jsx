import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Users, Home, Search, ChevronDown, ChevronUp } from "lucide-react";

export default function FamiliesPage() {
  const navigate = useNavigate();
  const [families, setFamilies] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [boothFilter, setBoothFilter] = useState("all");
  const [booths, setBooths] = useState([]);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get("/booths").then((r) => setBooths(r.data));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (boothFilter !== "all") params.set("booth_id", boothFilter);
    params.set("limit", "200");
    const t = setTimeout(() => {
      api.get(`/families?${params.toString()}`).then((r) => {
        setFamilies(r.data.families);
        setTotal(r.data.total_families);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [search, boothFilter]);

  return (
    <div className="space-y-6" data-testid="families-page">
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1020] p-6 md:p-8">
        <div className="brand-ring absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[#0B1020]/40" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
            <Home className="h-3 w-3" /> Households
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Voter <span className="viqso-gradient-text">Families</span>
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Auto-grouped by address + surname. Override manually from the survey form.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 p-4 shadow-none">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by surname, address or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="family-search-input"
            />
          </div>
          <Select value={boothFilter} onValueChange={setBoothFilter}>
            <SelectTrigger className="w-full md:w-[260px]"><SelectValue placeholder="Booth" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All booths</SelectItem>
              {booths.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.booth_number} · {b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Showing {families.length} of {total} families
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {families.map((f) => {
          const isOpen = expanded[f.family_id];
          return (
            <Card key={f.family_id} className="border-slate-200 p-4 shadow-none">
              <div
                className="flex cursor-pointer items-start justify-between"
                onClick={() => setExpanded({ ...expanded, [f.family_id]: !isOpen })}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white viqso-gradient">
                      <span className="text-xs font-bold">{f.surname?.[0] || "F"}</span>
                    </div>
                    <div>
                      <div className="font-display text-base font-semibold text-slate-900">
                        {f.surname} Family
                      </div>
                      <div className="text-xs text-slate-500">{f.address || "No address"}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-slate-900">{f.size}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">members</div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </div>

              {f.supporters > 0 && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {f.supporters} supporter{f.supporters > 1 ? "s" : ""}
                </div>
              )}

              {isOpen && (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                  {f.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50"
                      onClick={() => navigate(`/survey/${m.id}/edit`)}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-800">{m.name}</span>
                        <span className="text-xs text-slate-500">· {m.age || "?"}y · {m.gender || "?"}</span>
                      </div>
                      {m.political_preference && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {m.political_preference}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {families.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          No families found.
        </div>
      )}
    </div>
  );
}
