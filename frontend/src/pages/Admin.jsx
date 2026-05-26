import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger, TabsContent
} from "../components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select";
import { Plus, Trash2, UserCog, Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../context/SettingsContext";

const ROLE_BADGE = {
  admin: "bg-red-50 text-red-700 border-red-200",
  supervisor: "bg-amber-50 text-amber-700 border-amber-200",
  worker: "bg-blue-50 text-blue-700 border-blue-200",
};

function UserManager() {
  const [users, setUsers] = useState([]);
  const [booths, setBooths] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", name: "", role: "worker", phone: "", booth_id: "",
  });

  const load = () => api.get("/users").then((r) => setUsers(r.data));
  useEffect(() => {
    load();
    api.get("/booths").then((r) => setBooths(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", {
        ...form,
        assigned_booth_ids: form.booth_id ? [form.booth_id] : [],
      });
      toast.success("User created");
      setOpen(false);
      setForm({ email: "", password: "", name: "", role: "worker", phone: "", booth_id: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await api.delete(`/users/${id}`);
    toast.success("User deleted");
    load();
  };

  return (
    <Card className="border-slate-200 p-6 shadow-none">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-slate-900">Team Members ({users.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 text-white hover:bg-slate-800" data-testid="add-user-button">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="new-user-name" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="new-user-email" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required data-testid="new-user-password" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger data-testid="new-user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="worker">Field Worker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assigned Booth</Label>
                  <Select value={form.booth_id} onValueChange={(v) => setForm({ ...form, booth_id: v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {booths.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.booth_number} · {b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="new-user-submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200">
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-2 font-bold">Name</th>
              <th className="py-2 font-bold">Email</th>
              <th className="py-2 font-bold">Role</th>
              <th className="py-2 font-bold">Phone</th>
              <th className="py-2 font-bold">Booths</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-3 font-medium text-slate-900">{u.name}</td>
                <td className="py-3 text-slate-700">{u.email}</td>
                <td className="py-3">
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${ROLE_BADGE[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 font-mono text-xs text-slate-700">{u.phone || "—"}</td>
                <td className="py-3 text-xs text-slate-600">{(u.assigned_booth_ids || []).length}</td>
                <td className="py-3 text-right">
                  <button onClick={() => remove(u.id)} className="text-slate-400 hover:text-red-600" data-testid={`delete-user-${u.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BoothManager() {
  const [booths, setBooths] = useState([]);
  const load = () => api.get("/booths").then((r) => setBooths(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this booth?")) return;
    await api.delete(`/booths/${id}`);
    toast.success("Booth deleted");
    load();
  };

  return (
    <Card className="border-slate-200 p-6 shadow-none">
      <h3 className="font-display text-lg font-semibold text-slate-900">All Booths ({booths.length})</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200">
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-2 font-bold">Number</th>
              <th className="py-2 font-bold">Name</th>
              <th className="py-2 font-bold">Ward</th>
              <th className="py-2 font-bold">Target</th>
              <th className="py-2 font-bold">Surveyed</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {booths.map((b) => (
              <tr key={b.id} className="border-b border-slate-100">
                <td className="py-3 font-mono text-blue-700">{b.booth_number}</td>
                <td className="py-3 font-medium text-slate-900">{b.name}</td>
                <td className="py-3 text-slate-700">{b.ward}</td>
                <td className="py-3 font-mono text-slate-700">{b.target_voters}</td>
                <td className="py-3 font-mono text-slate-700">{b.voters_surveyed}</td>
                <td className="py-3 text-right">
                  <button onClick={() => remove(b.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PartySettings() {
  const { settings, update } = useSettings();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await update({
        party_name: form.party_name,
        party_short_name: form.party_short_name,
        tagline: form.tagline,
        logo_url: form.logo_url,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        highlight_color: form.highlight_color,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        campaign_slogan: form.campaign_slogan,
      });
      toast.success("Brand settings updated");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 p-6 shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-900">Party Branding</h3>
          <p className="text-sm text-slate-500">Customize the app for your political party — logo, colors, name. Changes apply immediately.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: form */}
        <div className="space-y-4">
          <div>
            <Label>Party Full Name</Label>
            <Input value={form.party_name || ""} onChange={(e) => set("party_name", e.target.value)} placeholder="e.g. Bharat Vikas Party" data-testid="settings-party-name" />
          </div>
          <div>
            <Label>Short Name (used in nav)</Label>
            <Input value={form.party_short_name || ""} onChange={(e) => set("party_short_name", e.target.value)} placeholder="e.g. BVP" data-testid="settings-short-name" />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline || ""} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g. Vikas · Vishwas · Vijay" />
          </div>
          <div>
            <Label>Campaign Slogan (login page hero)</Label>
            <Input value={form.campaign_slogan || ""} onChange={(e) => set("campaign_slogan", e.target.value)} placeholder="e.g. Win every booth" />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input value={form.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." data-testid="settings-logo-url" />
            <p className="mt-1 text-xs text-slate-500">Paste a direct image URL (PNG/JPG). Square aspect works best.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contact Email</Label>
              <Input value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={form.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Right: colors + preview */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Brand Gradient</div>
            <div
              className="mt-2 h-20 rounded-lg shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${form.secondary_color || "#1E90FF"} 0%, ${form.primary_color || "#8B5CF6"} 35%, ${form.accent_color || "#EC4899"} 70%, ${form.highlight_color || "#F97316"} 100%)`,
              }}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { k: "secondary_color", label: "Color 1" },
                { k: "primary_color", label: "Color 2" },
                { k: "accent_color", label: "Color 3" },
                { k: "highlight_color", label: "Color 4" },
              ].map((c) => (
                <div key={c.k}>
                  <Label className="text-xs">{c.label}</Label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={form[c.k] || "#8B5CF6"}
                      onChange={(e) => set(c.k, e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-slate-200"
                      data-testid={`color-${c.k}`}
                    />
                    <Input
                      value={form[c.k] || ""}
                      onChange={(e) => set(c.k, e.target.value)}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Logo Preview</div>
            <div className="mt-2 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              {form.logo_url && (
                <img src={form.logo_url} alt="logo" className="h-14 w-14 rounded-lg object-cover" />
              )}
              <div>
                <div
                  className="font-display text-xl font-extrabold tracking-tight"
                  style={{
                    background: `linear-gradient(135deg, ${form.secondary_color} 0%, ${form.primary_color} 35%, ${form.accent_color} 70%, ${form.highlight_color} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {form.party_short_name || "VIQSO"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {form.party_name?.replace(form.party_short_name || "", "").trim() || "Digital Media"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          className="group relative h-10 overflow-hidden rounded-lg text-white shadow-lg"
          data-testid="save-settings-button"
        >
          <span className="absolute inset-0 viqso-gradient" />
          <span className="relative flex items-center font-semibold">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save brand settings"}
          </span>
        </Button>
      </div>
    </Card>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-6" data-testid="admin-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">System</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <UserCog className="h-7 w-7" /> Admin Panel
        </h1>
        <p className="mt-1 text-sm text-slate-500">Manage users, booths, branding, and system settings.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="booths" data-testid="tab-booths">Booths</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings"><Palette className="mr-1.5 h-3.5 w-3.5" />Branding</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <UserManager />
        </TabsContent>
        <TabsContent value="booths" className="mt-4">
          <BoothManager />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <PartySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
