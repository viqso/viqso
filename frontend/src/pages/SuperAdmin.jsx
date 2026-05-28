import React, { useEffect, useState } from "react";
import api, { API } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "../components/ui/dialog";
import { Building2, Plus, KeyRound, Copy, ShieldAlert, Power } from "lucide-react";
import { toast } from "sonner";

// Standalone page — requires X-Super-Admin-Key header. Accessed at /super-admin?key=...
export default function SuperAdminPage() {
  const [superKey, setSuperKey] = useState(() => localStorage.getItem("super_admin_key") || "");
  const [unlocked, setUnlocked] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(null);
  const [form, setForm] = useState({
    name: "", party_name: "", admin_email: "", admin_password: "", admin_name: "Administrator",
    is_demo: false, expires_in_days: "", watermark: "",
  });

  const load = async (key) => {
    const k = key || superKey;
    if (!k) return;
    try {
      const res = await fetch(`${API}/orgs`, { headers: { "X-Super-Admin-Key": k } });
      if (!res.ok) throw new Error("Invalid key");
      const data = await res.json();
      setOrgs(data);
      setUnlocked(true);
      localStorage.setItem("super_admin_key", k);
    } catch {
      toast.error("Invalid super-admin key");
      setUnlocked(false);
    }
  };

  useEffect(() => {
    if (superKey) load(superKey);
    // eslint-disable-next-line
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        party_name: form.party_name,
        admin_email: form.admin_email,
        admin_password: form.admin_password,
        admin_name: form.admin_name,
        is_demo: !!form.is_demo,
      };
      if (form.is_demo) {
        if (form.expires_in_days) payload.expires_in_days = parseInt(form.expires_in_days, 10);
        if (form.watermark && form.watermark.trim()) payload.watermark = form.watermark.trim();
      }
      const res = await fetch(`${API}/orgs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Super-Admin-Key": superKey },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setCreated(data);
      toast.success("Organization created");
      setForm({ name: "", party_name: "", admin_email: "", admin_password: "", admin_name: "Administrator", is_demo: false, expires_in_days: "", watermark: "" });
      load(superKey);
    } catch (err) {
      toast.error(String(err.message || err));
    }
  };

  const toggleActive = async (org) => {
    try {
      const res = await fetch(`${API}/orgs/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Super-Admin-Key": superKey },
        body: JSON.stringify({ active: !org.active }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(org.active ? "Org disabled" : "Org enabled");
      load(superKey);
    } catch {
      toast.error("Failed");
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1020] p-6">
        <Card className="w-full max-w-md border-slate-200 p-6 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Super-Admin Console</h1>
          <p className="mt-1 text-sm text-slate-500">
            Master access for VIQSO Digital Media. Enter your master key to manage all client organizations.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); load(superKey); }}
            className="mt-6 space-y-3"
          >
            <Label>Master Key</Label>
            <Input
              type="password"
              value={superKey}
              onChange={(e) => setSuperKey(e.target.value)}
              placeholder="VIQSO-MASTER-…"
              className="font-mono"
              data-testid="super-admin-key-input"
            />
            <Button type="submit" className="w-full viqso-gradient text-white" data-testid="super-admin-unlock-button">
              <KeyRound className="mr-2 h-4 w-4" /> Unlock
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">VIQSO Master Console</div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Building2 className="h-7 w-7" /> Organizations
            </h1>
            <p className="text-sm text-slate-500">Manage client orgs. Each org gets a unique access key + admin account.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="viqso-gradient text-white">
                <Plus className="mr-2 h-4 w-4" /> New Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Create new client organization</DialogTitle></DialogHeader>
              {!created ? (
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <Label>Organization Name (internal)</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bharat Vikas Party - Maharashtra" required />
                  </div>
                  <div>
                    <Label>Party / Display Name</Label>
                    <Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} placeholder="e.g. Bharat Vikas Party" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Admin Name</Label>
                      <Input value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Admin Email</Label>
                      <Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} required />
                    </div>
                  </div>
                  <div>
                    <Label>Admin Password (share with client)</Label>
                    <Input type="text" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} placeholder="min 6 chars" required />
                  </div>

                  {/* Demo Mode Section */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_demo}
                        onChange={(e) => setForm({ ...form, is_demo: e.target.checked })}
                        className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                        data-testid="org-is-demo-checkbox"
                      />
                      <span className="text-sm font-semibold text-amber-900">Create as Demo Organization</span>
                    </label>
                    <p className="text-[11px] text-amber-700 -mt-1">
                      Demo orgs are view-only after expiry and show a watermark across the app. Useful for sales presentations.
                    </p>
                    {form.is_demo && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Expires in (days)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={form.expires_in_days}
                            onChange={(e) => setForm({ ...form, expires_in_days: e.target.value })}
                            placeholder="e.g. 7"
                            data-testid="org-expires-in-days-input"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Watermark Text</Label>
                          <Input
                            type="text"
                            value={form.watermark}
                            onChange={(e) => setForm({ ...form, watermark: e.target.value })}
                            placeholder="DEMO PREVIEW"
                            data-testid="org-watermark-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button type="submit" className="viqso-gradient text-white">Create org + auto-generate access key</Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">✓ Organization created</div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Access Key</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded bg-white border border-slate-200 px-2 py-1 font-mono text-sm">{created.org.access_key}</code>
                          <Button size="sm" variant="outline" onClick={() => copy(created.org.access_key)}><Copy className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Admin Email</div>
                        <code className="block rounded bg-white border border-slate-200 px-2 py-1 font-mono text-sm">{created.admin.email}</code>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Admin Password</div>
                        <code className="block rounded bg-white border border-slate-200 px-2 py-1 font-mono text-sm">{created.admin.password}</code>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-emerald-700">
                      Share these credentials with the client. They sign in at <code>/login</code> with all three.
                    </div>
                  </div>
                  <Button onClick={() => { setCreated(null); setOpen(false); }} className="w-full">Done</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {orgs.map((o) => (
            <Card key={o.id} className="border-slate-200 p-5 shadow-none">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-bold text-slate-900">{o.name}</div>
                  <div className="text-xs text-slate-500">{o.party_name}</div>
                  {o.is_demo && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      DEMO
                      {o.expires_at && (
                        <span className="font-mono font-normal opacity-80">
                          · exp {new Date(o.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${o.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {o.active ? "ACTIVE" : "DISABLED"}
                </span>
              </div>
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Access Key</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm font-semibold text-slate-900">{o.access_key}</code>
                  <button onClick={() => copy(o.access_key)} className="text-slate-400 hover:text-slate-700">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Users</div>
                  <div className="font-mono text-base font-bold text-slate-900">{o.user_count}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Voters</div>
                  <div className="font-mono text-base font-bold text-slate-900">{o.voter_count}</div>
                </div>
              </div>
              <Button
                onClick={() => toggleActive(o)}
                variant="outline"
                size="sm"
                className="mt-3 w-full"
              >
                <Power className="mr-2 h-3 w-3" />
                {o.active ? "Disable org" : "Enable org"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
