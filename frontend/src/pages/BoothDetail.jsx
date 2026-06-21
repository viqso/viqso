import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, MapPin, Users, Target, ClipboardList, Printer } from "lucide-react";

export default function BoothDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booth, setBooth] = useState(null);
  const [voters, setVoters] = useState([]);

  useEffect(() => {
    api.get(`/booths/${id}`).then((r) => setBooth(r.data));
    api.get(`/voters?booth_id=${id}&limit=200`).then((r) => setVoters(r.data));
  }, [id]);

  if (!booth) return <div className="text-slate-500">Loading…</div>;

  const pct = booth.target_voters ? Math.min(100, Math.round((booth.voters_surveyed / booth.target_voters) * 100)) : 0;

  return (
    <div className="space-y-6" data-testid="booth-detail-page">
      <Button variant="ghost" size="sm" onClick={() => navigate("/booths")} data-testid="back-to-booths">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Booths
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-600">
            {booth.booth_number}
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900">{booth.name}</h1>
          <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5" /> {booth.ward} · {booth.constituency}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/booths/${id}/bulk-slips`)} variant="outline" className="border-slate-300 bg-white hover:bg-slate-50">
            <Printer className="mr-2 h-4 w-4" /> Bulk Slips
          </Button>
          <Button onClick={() => navigate(`/survey/new?booth_id=${id}`)} className="bg-blue-600 text-white hover:bg-blue-700">
            <ClipboardList className="mr-2 h-4 w-4" /> New Survey
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-slate-200 p-5 shadow-none">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Target</div>
          <div className="mt-1 font-display text-3xl font-bold text-slate-900">{booth.target_voters}</div>
        </Card>
        <Card className="border-slate-200 p-5 shadow-none">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Surveyed</div>
          <div className="mt-1 font-display text-3xl font-bold text-slate-900">{booth.voters_surveyed}</div>
        </Card>
        <Card className="border-slate-200 p-5 shadow-none">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Completion</div>
          <div className="mt-1 font-display text-3xl font-bold text-slate-900">{pct}%</div>
        </Card>
        <Card className="border-slate-200 p-5 shadow-none">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Workers</div>
          <div className="mt-1 font-display text-3xl font-bold text-slate-900">{(booth.workers || []).length}</div>
        </Card>
      </div>

      <Card className="border-slate-200 p-6 shadow-none">
        <h3 className="font-display text-lg font-semibold text-slate-900">Assigned Workers</h3>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {(booth.workers || []).map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-md border border-slate-200 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {w.name?.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">{w.name}</div>
                <div className="truncate text-xs text-slate-500">{w.email}</div>
              </div>
            </div>
          ))}
          {(booth.workers || []).length === 0 && (
            <div className="col-span-full text-sm text-slate-500">No workers assigned yet.</div>
          )}
        </div>
      </Card>

      <Card className="border-slate-200 p-6 shadow-none">
        <h3 className="font-display text-lg font-semibold text-slate-900">Recent Surveys ({voters.length})</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2 font-bold">Voter</th>
                <th className="py-2 font-bold">Age</th>
                <th className="py-2 font-bold">Preference</th>
                <th className="py-2 font-bold">Sentiment</th>
                <th className="py-2 font-bold">Surveyed</th>
              </tr>
            </thead>
            <tbody>
              {voters.slice(0, 20).map((v) => (
                <tr
                  key={v.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => navigate(`/survey/${v.id}/edit`)}
                >
                  <td className="py-3">
                    <div className="font-medium text-slate-900">{v.name}</div>
                    <div className="text-xs text-slate-500">{v.voter_id_number}</div>
                  </td>
                  <td className="py-3 text-slate-700">{v.age || "—"}</td>
                  <td className="py-3 capitalize text-slate-700">{v.political_preference || "—"}</td>
                  <td className="py-3 capitalize text-slate-700">{v.sentiment || "—"}</td>
                  <td className="py-3 text-xs text-slate-500">
                    {v.surveyed_at ? new Date(v.surveyed_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {voters.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-sm text-slate-500" colSpan={5}>
                    No surveys recorded yet for this booth.
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
