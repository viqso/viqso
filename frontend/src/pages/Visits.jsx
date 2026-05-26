import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select";
import { Calendar, Plus, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const STATUS_COLOR = {
  scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  missed: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_ICON = {
  scheduled: Clock,
  completed: CheckCircle2,
  missed: XCircle,
};

export default function VisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [booths, setBooths] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ booth_id: "", worker_id: "", scheduled_date: "", notes: "" });

  const load = () => api.get("/visits").then((r) => setVisits(r.data));
  useEffect(() => {
    load();
    if (user?.role !== "worker") {
      api.get("/users").then((r) => setWorkers(r.data.filter((u) => u.role === "worker")));
    }
    api.get("/booths").then((r) => setBooths(r.data));
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/visits", form);
      toast.success("Visit scheduled");
      setOpen(false);
      setForm({ booth_id: "", worker_id: "", scheduled_date: "", notes: "" });
      load();
    } catch {
      toast.error("Failed to schedule visit");
    }
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/visits/${id}`, { status });
    toast.success("Visit updated");
    load();
  };

  const boothById = Object.fromEntries(booths.map((b) => [b.id, b]));
  const workerById = Object.fromEntries(workers.map((w) => [w.id, w]));

  return (
    <div className="space-y-6" data-testid="visits-page">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Field Schedule</div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Visits</h1>
          <p className="mt-1 text-sm text-slate-500">Plan and track field operations across booths.</p>
        </div>
        {user?.role !== "worker" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 text-white hover:bg-slate-800" data-testid="schedule-visit-button">
                <Plus className="mr-2 h-4 w-4" /> Schedule Visit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule a visit</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label>Booth</Label>
                  <Select value={form.booth_id} onValueChange={(v) => setForm({ ...form, booth_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select booth" /></SelectTrigger>
                    <SelectContent>
                      {booths.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.booth_number} · {b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Worker</Label>
                  <Select value={form.worker_id} onValueChange={(v) => setForm({ ...form, worker_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                    <SelectContent>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} required />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visits.map((v) => {
          const Icon = STATUS_ICON[v.status] || Clock;
          const booth = boothById[v.booth_id];
          const worker = workerById[v.worker_id];
          const dateLabel = v.scheduled_date ? new Date(v.scheduled_date).toLocaleString() : "—";
          return (
            <Card key={v.id} className="border-slate-200 p-4 shadow-none">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLOR[v.status]}`}>
                  <Icon className="h-3 w-3" /> {v.status}
                </span>
                <span className="font-mono text-[11px] text-slate-500">{dateLabel}</span>
              </div>
              <div className="mt-3">
                <div className="font-display text-base font-semibold text-slate-900">
                  {booth ? `${booth.booth_number} · ${booth.name}` : "—"}
                </div>
                <div className="text-xs text-slate-500">Worker: {worker?.name || "Field worker"}</div>
              </div>
              {v.notes && <div className="mt-2 text-xs text-slate-600">{v.notes}</div>}
              {v.voters_contacted ? (
                <div className="mt-2 text-xs font-semibold text-emerald-700">
                  {v.voters_contacted} voters contacted
                </div>
              ) : null}
              {v.status === "scheduled" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(v.id, "completed")} data-testid={`mark-complete-${v.id}`}>
                    Mark Complete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(v.id, "missed")}>
                    Missed
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {visits.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
            No visits scheduled yet.
          </div>
        )}
      </div>
    </div>
  );
}
