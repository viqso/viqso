import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Vote, Search, CheckCircle, RefreshCw, Users, Award } from "lucide-react";
import { toast } from "sonner";

export default function PollingDayPage() {
  const [booths, setBooths] = useState([]);
  const [selectedBooth, setSelectedBooth] = useState("all");
  const [voters, setVoters] = useState([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    voted: 0,
    supportersTotal: 0,
    supportersVoted: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/booths").then((r) => {
      setBooths(r.data);
      if (r.data.length > 0) {
        setSelectedBooth(r.data[0].id);
      }
    });
  }, []);

  const fetchVoters = () => {
    if (selectedBooth === "all") return;
    setLoading(true);
    api.get(`/voters?booth_id=${selectedBooth}&limit=1000`)
      .then((r) => {
        setVoters(r.data);
        calculateStats(r.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load voters for polling day");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVoters();
  }, [selectedBooth]);

  const calculateStats = (voterList) => {
    const total = voterList.length;
    const voted = voterList.filter((v) => v.voted).length;
    const supportersTotal = voterList.filter((v) => v.political_preference === "supporter").length;
    const supportersVoted = voterList.filter((v) => v.political_preference === "supporter" && v.voted).length;

    setStats({ total, voted, supportersTotal, supportersVoted });
  };

  const toggleVotedStatus = (voter) => {
    const targetStatus = !voter.voted;
    
    // Optimistic UI update
    const updatedVoters = voters.map((v) => (v.id === voter.id ? { ...v, voted: targetStatus } : v));
    setVoters(updatedVoters);
    calculateStats(updatedVoters);

    api.patch(`/voters/${voter.id}`, { voted: targetStatus })
      .then((r) => {
        toast.success(`${voter.name} marked as ${targetStatus ? "voted" : "not voted"}`);
      })
      .catch(() => {
        toast.error("Failed to update voting status");
        // Revert on failure
        fetchVoters();
      });
  };

  const filteredVoters = voters.filter((v) => {
    const s = search.toLowerCase();
    return (
      (v.name || "").toLowerCase().includes(s) ||
      (v.name_en || "").toLowerCase().includes(s) ||
      (v.voter_id_number || "").toLowerCase().includes(s) ||
      (v.serial_number || "").toString().includes(s)
    );
  });

  const turnoutPct = stats.total > 0 ? Math.round((stats.voted / stats.total) * 100) : 0;
  const supporterTurnoutPct = stats.supportersTotal > 0 ? Math.round((stats.supportersVoted / stats.supportersTotal) * 100) : 0;

  return (
    <div className="space-y-6" data-testid="polling-day-page">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1020] p-6 md:p-8">
        <div className="brand-ring absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[#0B1020]/40" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              <Vote className="h-3 w-3" /> Live Operations
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Polling Day <span className="viqso-gradient-text">Turnout Console</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Track live voter turnout and coordinate supporter mobilization in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedBooth} onValueChange={setSelectedBooth}>
              <SelectTrigger className="w-[260px] bg-slate-900 text-white border-slate-700">
                <SelectValue placeholder="Select Booth" />
              </SelectTrigger>
              <SelectContent>
                {booths.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.booth_number} · {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchVoters} variant="outline" className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-slate-200 p-5 shadow-none flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Booth Voters</div>
            <div className="mt-1 font-display text-3xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <Users className="h-8 w-8 text-slate-300" />
        </Card>
        <Card className="border-slate-200 p-5 shadow-none flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Voted / Turnout</div>
            <div className="mt-1 font-display text-3xl font-bold text-slate-900">{stats.voted} <span className="text-sm font-semibold text-slate-500">({turnoutPct}%)</span></div>
          </div>
          <Vote className="h-8 w-8 text-slate-300" />
        </Card>
        <Card className="border-slate-200 p-5 shadow-none flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Total Supporters</div>
            <div className="mt-1 font-display text-3xl font-bold text-emerald-600">{stats.supportersTotal}</div>
          </div>
          <Award className="h-8 w-8 text-emerald-100" />
        </Card>
        <Card className="border-slate-200 p-5 shadow-none flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Supporters Voted</div>
            <div className="mt-1 font-display text-3xl font-bold text-emerald-700">{stats.supportersVoted} <span className="text-sm font-semibold text-emerald-600">({supporterTurnoutPct}%)</span></div>
          </div>
          <CheckCircle className="h-8 w-8 text-emerald-200" />
        </Card>
      </div>

      {/* Voters List Ledger */}
      <Card className="border-slate-200 p-6 shadow-none">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search voter by name, voter ID number, address, or serial number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2 font-bold w-16">S.No</th>
                <th className="py-2 font-bold">Voter Name / EPIC</th>
                <th className="py-2 font-bold">Age/Gender</th>
                <th className="py-2 font-bold">Preference</th>
                <th className="py-2 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVoters.map((v, idx) => (
                <tr
                  key={v.id}
                  className={`border-b border-slate-100 transition-colors ${v.voted ? "bg-emerald-50/20" : "hover:bg-slate-50"}`}
                >
                  <td className="py-3 font-mono font-bold text-slate-500">{v.serial_number || idx + 1}</td>
                  <td className="py-3">
                    <div className="font-semibold text-slate-900">
                      {v.name}
                      {v.name_en && v.name_en !== v.name && (
                        <span className="ml-2 font-normal text-xs text-slate-500">({v.name_en})</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{v.voter_id_number || "No Voter ID"}</div>
                  </td>
                  <td className="py-3 text-slate-700 capitalize">
                    {v.age || "—"}y / {v.gender || "—"}
                  </td>
                  <td className="py-3">
                    {v.political_preference === "supporter" ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Supporter
                      </span>
                    ) : v.political_preference === "opposition" ? (
                      <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                        Opposition
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        Neutral
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      onClick={() => toggleVotedStatus(v)}
                      variant={v.voted ? "default" : "outline"}
                      className={`h-8 px-4 ${v.voted ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-300 text-slate-800 hover:bg-slate-50"}`}
                    >
                      {v.voted ? "Marked Voted" : "Mark Voted"}
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredVoters.length === 0 && (
                <tr>
                  <td className="py-12 text-center text-sm text-slate-500" colSpan={5}>
                    No voters matching the search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
