import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { MapPin, Plus, ArrowUpRight, Users, Target } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function BoothsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booths, setBooths] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    booth_number: "",
    ward: "",
    constituency: "",
    location: "",
    target_voters: 1000,
  });

  const load = () => api.get("/booths").then((r) => setBooths(r.data));

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/booths", { ...form, target_voters: Number(form.target_voters) });
      toast.success("Booth created");
      setOpen(false);
      setForm({ name: "", booth_number: "", ward: "", constituency: "", location: "", target_voters: 1000 });
      load();
    } catch (err) {
      toast.error("Failed to create booth");
    }
  };

  return (
    <div className="space-y-6" data-testid="booths-page">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Field Coverage</div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Booths</h1>
          <p className="mt-1 text-sm text-slate-500">{booths.length} active booths in your scope.</p>
        </div>
        {user?.role === "admin" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 text-white hover:bg-slate-800" data-testid="add-booth-button">
                <Plus className="mr-2 h-4 w-4" /> Add Booth
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a new booth</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="booth-name-input" />
                  </div>
                  <div>
                    <Label>Booth Number</Label>
                    <Input value={form.booth_number} onChange={(e) => setForm({ ...form, booth_number: e.target.value })} required data-testid="booth-number-input" />
                  </div>
                  <div>
                    <Label>Ward</Label>
                    <Input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Constituency</Label>
                    <Input value={form.constituency} onChange={(e) => setForm({ ...form, constituency: e.target.value })} required />
                  </div>
                  <div className="col-span-2">
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div>
                    <Label>Target Voters</Label>
                    <Input type="number" value={form.target_voters} onChange={(e) => setForm({ ...form, target_voters: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="booth-create-submit">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {booths.map((b) => {
          const pct = b.target_voters ? Math.min(100, Math.round((b.voters_surveyed / b.target_voters) * 100)) : 0;
          return (
            <Card
              key={b.id}
              className="cursor-pointer border-slate-200 p-5 shadow-none transition-all hover:-translate-y-[1px] hover:border-slate-400"
              onClick={() => navigate(`/booths/${b.id}`)}
              data-testid={`booth-card-${b.booth_number}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-600">
                    {b.booth_number}
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold text-slate-900">{b.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {b.ward}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
                    <Users className="h-3 w-3" /> Surveyed
                  </div>
                  <div className="mt-0.5 font-display text-xl font-bold text-slate-900">{b.voters_surveyed}</div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
                    <Target className="h-3 w-3" /> Target
                  </div>
                  <div className="mt-0.5 font-display text-xl font-bold text-slate-900">{b.target_voters}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Completion</span>
                  <span className="font-mono text-slate-900">{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-blue-600" : "bg-amber-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
        {booths.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
            No booths assigned yet.
          </div>
        )}
      </div>
    </div>
  );
}
