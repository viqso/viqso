import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Switch } from "../components/ui/switch";
import { ArrowLeft, Save, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

const ISSUES = [
  "Water Supply", "Road Infrastructure", "Healthcare", "Education",
  "Employment", "Sanitation", "Power Cuts", "Public Transport",
  "Crime & Safety", "Inflation", "Housing", "Pollution",
];

const STEPS = ["Basic Info", "Demographics", "Political View", "Issues & Custom"];

export default function SurveyFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(0);
  const [booths, setBooths] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    booth_id: searchParams.get("booth_id") || "",
    name: "",
    voter_id_number: "",
    age: "",
    gender: "",
    address: "",
    phone: "",
    email: "",
    caste: "",
    religion: "",
    occupation: "",
    political_preference: "",
    sentiment: "",
    issues: [],
    likely_to_vote: false,
    notes: "",
    custom_fields: {},
  });
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    api.get("/booths").then((r) => setBooths(r.data));
    if (isEdit) {
      api.get(`/voters/${id}`).then((r) => {
        const d = r.data;
        setForm({
          ...form,
          ...d,
          age: d.age || "",
          custom_fields: d.custom_fields || {},
          issues: d.issues || [],
          likely_to_vote: Boolean(d.likely_to_vote),
        });
      });
    }
    // eslint-disable-next-line
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleIssue = (issue) => {
    set("issues", form.issues.includes(issue) ? form.issues.filter((i) => i !== issue) : [...form.issues, issue]);
  };

  const addCustomField = () => {
    if (!customKey.trim()) return;
    set("custom_fields", { ...form.custom_fields, [customKey]: customValue });
    setCustomKey(""); setCustomValue("");
  };
  const removeCustomField = (key) => {
    const cf = { ...form.custom_fields };
    delete cf[key];
    set("custom_fields", cf);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.booth_id || !form.name) {
      toast.error("Booth and Name are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, age: form.age ? Number(form.age) : null };
      if (isEdit) {
        await api.patch(`/voters/${id}`, payload);
        toast.success("Survey updated");
      } else {
        await api.post("/voters", payload);
        toast.success("Survey saved");
      }
      navigate("/voters");
    } catch (err) {
      toast.error("Failed to save survey");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!isEdit || !window.confirm("Delete this voter record?")) return;
    await api.delete(`/voters/${id}`);
    toast.success("Deleted");
    navigate("/voters");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="survey-form-page">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="survey-back-button">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
          {isEdit ? "Edit Survey" : "New Survey"}
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Voter Survey
        </h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            data-testid={`step-${i}-button`}
            className={`flex-1 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
              step === i
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            <div className="text-[9px] uppercase tracking-wider opacity-70">Step {i + 1}</div>
            <div className="font-semibold">{s}</div>
          </button>
        ))}
      </div>

      <Card className="border-slate-200 p-6 shadow-none">
        <form onSubmit={submit} className="space-y-5">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Booth *</Label>
                <Select value={form.booth_id} onValueChange={(v) => set("booth_id", v)}>
                  <SelectTrigger data-testid="survey-booth-select"><SelectValue placeholder="Select booth" /></SelectTrigger>
                  <SelectContent>
                    {booths.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.booth_number} · {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Voter Name *</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} required data-testid="survey-name-input" />
                </div>
                <div>
                  <Label>Voter ID</Label>
                  <Input value={form.voter_id_number} onChange={(e) => set("voter_id_number", e.target.value)} data-testid="survey-voter-id-input" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <RadioGroup value={form.gender} onValueChange={(v) => set("gender", v)} className="flex gap-3 pt-2">
                    {["male", "female", "other"].map((g) => (
                      <div key={g} className="flex items-center gap-1.5">
                        <RadioGroupItem value={g} id={`g-${g}`} />
                        <Label htmlFor={`g-${g}`} className="capitalize">{g}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <Label>Religion</Label>
                  <Select value={form.religion} onValueChange={(v) => set("religion", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Caste</Label>
                  <Select value={form.caste} onValueChange={(v) => set("caste", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["General", "OBC", "SC", "ST"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Occupation</Label>
                  <Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">Political Preference</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { v: "supporter", label: "Supporter", c: "border-emerald-200 data-[active=true]:bg-emerald-50 data-[active=true]:border-emerald-500" },
                    { v: "neutral", label: "Neutral", c: "border-slate-200 data-[active=true]:bg-slate-100 data-[active=true]:border-slate-500" },
                    { v: "undecided", label: "Undecided", c: "border-amber-200 data-[active=true]:bg-amber-50 data-[active=true]:border-amber-500" },
                    { v: "opposition", label: "Opposition", c: "border-red-200 data-[active=true]:bg-red-50 data-[active=true]:border-red-500" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      data-active={form.political_preference === opt.v}
                      onClick={() => set("political_preference", opt.v)}
                      className={`rounded-md border bg-white px-3 py-3 text-sm font-semibold transition-colors ${opt.c}`}
                      data-testid={`pref-${opt.v}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Sentiment</Label>
                <RadioGroup value={form.sentiment} onValueChange={(v) => set("sentiment", v)} className="flex flex-wrap gap-3">
                  {["positive", "neutral", "negative"].map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                      <RadioGroupItem value={s} id={`s-${s}`} />
                      <Label htmlFor={`s-${s}`} className="capitalize">{s}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <Label>Likely to Vote</Label>
                  <div className="text-xs text-slate-500">Voter intends to cast vote on polling day</div>
                </div>
                <Switch checked={form.likely_to_vote} onCheckedChange={(v) => set("likely_to_vote", v)} data-testid="likely-to-vote-switch" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">Key Issues (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ISSUES.map((iss) => (
                    <label
                      key={iss}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                        form.issues.includes(iss) ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <Checkbox
                        checked={form.issues.includes(iss)}
                        onCheckedChange={() => toggleIssue(iss)}
                        data-testid={`issue-${iss.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      />
                      {iss}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Additional observations or context"
                  rows={3}
                />
              </div>

              <div>
                <Label className="mb-2 block">Custom Fields</Label>
                <div className="space-y-2">
                  {Object.entries(form.custom_fields).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                      <div className="flex-1 text-sm">
                        <span className="font-semibold text-slate-700">{k}: </span>
                        <span className="text-slate-600">{v}</span>
                      </div>
                      <button type="button" onClick={() => removeCustomField(k)} className="text-slate-400 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input placeholder="Field name" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
                  <Input placeholder="Value" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
                  <Button type="button" variant="outline" onClick={addCustomField} data-testid="add-custom-field">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="flex gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)} data-testid="step-prev-button">
                  Previous
                </Button>
              )}
              {step < STEPS.length - 1 && (
                <Button type="button" onClick={() => setStep(step + 1)} className="bg-slate-900 text-white hover:bg-slate-800" data-testid="step-next-button">
                  Next
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {isEdit && (
                <Button type="button" variant="outline" onClick={remove} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
              <Button type="submit" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700" data-testid="survey-submit-button">
                <Save className="mr-2 h-4 w-4" />
                {submitting ? "Saving…" : isEdit ? "Update Survey" : "Save Survey"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
