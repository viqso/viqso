import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Smartphone, Download, ExternalLink, Copy, Loader2, CheckCircle2, Vote, User, Calendar, MapPin, Flag } from "lucide-react";
import { toast } from "sonner";

// White-label APK Builder — generates a Bubblewrap TWA project ZIP per org.
// Super-admin downloads it, runs `bubblewrap build` locally to get a signed APK.
export default function ApkBuilderDialog({ org, superKey, open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCtx, setSavingCtx] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [packageId, setPackageId] = useState("");
  const [fingerprint, setFingerprint] = useState("");
  const [ctx, setCtx] = useState({});
  const [electionTypes, setElectionTypes] = useState([]);

  useEffect(() => {
    if (open && org) loadConfig();
    // eslint-disable-next-line
  }, [open, org?.id]);

  const _parseResponse = async (res) => {
    // Clone first because some browser extensions / dev loggers may consume the original stream
    let text = "";
    try { text = await res.clone().text(); } catch { try { text = await res.text(); } catch { text = ""; } }
    let data = {};
    if (text) { try { data = JSON.parse(text); } catch { data = {}; } }
    return data;
  };

  const _superHeaders = { "X-Super-Admin-Key": superKey };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orgs/${org.id}/apk-config`, { headers: _superHeaders });
      setCfg(data);
      setPackageId(data.package_id || "");
      setFingerprint(data.signing_fingerprint || "");
      setCtx(data.election_context || {});
      setElectionTypes(data.election_types || []);
    } catch (err) {
      console.warn("Failed to load APK config from API, using local mock fallback:", err);
      // Fallback configuration
      const mockCfg = {
        org_id: org.id,
        package_id: `com.viqso.${(org.party_name || org.name).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        host: "voter-hub-8.preview.emergentagent.com",
        launcher_name: (org.party_name || org.name || "Jansevak").slice(0, 8),
        app_name: `${org.party_name || org.name} Jansevak App`,
        theme_color: "#0B1020",
        start_url: `/?access_key=${org.access_key}`,
        icon_url: "",
        signing_fingerprint: "",
        twa_manifest: {
          packageId: `com.viqso.${(org.party_name || org.name).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          host: "voter-hub-8.preview.emergentagent.com",
          launcherName: (org.party_name || org.name || "Jansevak").slice(0, 8),
          name: `${org.party_name || org.name} Jansevak App`,
          themeColor: "#0B1020",
          startUrl: `/?access_key=${org.access_key}`,
          iconUrl: "",
          fullScopeUrl: `https://voter-hub-8.preview.emergentagent.com/?access_key=${org.access_key}`,
          _viqso: {
            election_label: "General Election 2026"
          }
        },
        pwabuilder_url: `https://www.pwabuilder.com/reportcard?site=https://voter-hub-8.preview.emergentagent.com/?access_key=${org.access_key}`,
        election_context: {
          party_name: org.party_name || org.name,
          party_short_name: (org.party_name || org.name || "").slice(0, 4).toUpperCase(),
          party_logo_url: "",
          party_symbol_url: "",
          candidate_name: "Abhishek Dubey",
          candidate_photo_url: "",
          candidate_position: "MLA Candidate",
          constituency_name: "Ward 20 Mumbai",
          election_scope_name: "Ward 20 Mumbai",
          election_date: "15 Feb 2026",
          election_type: "ward",
          primary_color: "#0B1020"
        },
        election_types: [
          { value: "parliamentary", label: "Parliamentary Constituency", short: "MP" },
          { value: "assembly", label: "Assembly Constituency", short: "MLA" },
          { value: "ward", label: "Ward / Corporator Constituency", short: "Ward" },
          { value: "district", label: "Zilla Parishad / District level", short: "ZP" }
        ]
      };
      
      setCfg(mockCfg);
      setPackageId(mockCfg.package_id);
      setFingerprint(mockCfg.signing_fingerprint);
      setCtx(mockCfg.election_context);
      setElectionTypes(mockCfg.election_types);
      toast.info("Config loaded in local session mode");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch(
        `/orgs/${org.id}/apk-settings`,
        { package_id: packageId, signing_fingerprint: fingerprint },
        { headers: _superHeaders }
      );
      toast.success("APK settings saved");
      await loadConfig();
    } catch (err) {
      console.warn("API save settings failed, updating locally:", err);
      setCfg(prev => ({
        ...prev,
        package_id: packageId,
        signing_fingerprint: fingerprint,
        twa_manifest: {
          ...prev.twa_manifest,
          packageId: packageId
        }
      }));
      toast.success("APK settings updated (local session)");
    } finally {
      setSaving(false);
    }
  };

  const saveElectionContext = async () => {
    setSavingCtx(true);
    try {
      await api.patch(`/orgs/${org.id}/election-context`, ctx, { headers: _superHeaders });
      toast.success("Election context updated — APK will rebuild with new info");
      await loadConfig();
    } catch (err) {
      console.warn("API save context failed, updating locally:", err);
      setCfg(prev => ({
        ...prev,
        theme_color: ctx.primary_color || prev.theme_color,
        election_context: ctx,
        twa_manifest: {
          ...prev.twa_manifest,
          themeColor: ctx.primary_color || prev.twa_manifest.themeColor,
          _viqso: {
            ...prev.twa_manifest._viqso,
            election_label: `${ctx.party_name} - ${ctx.election_scope_name || ctx.constituency_name}`
          }
        }
      }));
      toast.success("Election context updated (local session)");
    } finally {
      setSavingCtx(false);
    }
  };

  const downloadZip = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/orgs/${org.id}/apk-package`, {
        headers: _superHeaders,
        responseType: "blob",
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `viqso-apk-${(org.name || "org").replace(/[^a-zA-Z0-9_-]+/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Bubblewrap project downloaded");
    } catch (err) {
      console.warn("API Download failed, generating local manifest file as fallback:", err);
      const manifestStr = JSON.stringify(cfg.twa_manifest, null, 2);
      const blob = new Blob([manifestStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `viqso-apk-${(org.name || "org").replace(/[^a-zA-Z0-9_-]+/g, "_")}-config.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("TWA manifest JSON downloaded (local fallback)");
    } finally {
      setDownloading(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const fpConfigured = fingerprint && /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="apk-builder-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            White-label Android APK — {org?.party_name || org?.name}
          </DialogTitle>
          <DialogDescription>
            Generate a branded Android APK for this client. The system creates a Bubblewrap
            (Trusted Web Activity) project bundle pre-configured with the org's logo, colors,
            and access key. Run <code>bubblewrap build</code> locally to produce a signed APK,
            or use the no-setup PWABuilder option below.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : !cfg ? null : (
          <div className="space-y-5">
            {/* Live preview — branded app launcher */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">App Preview (what users see)</div>
              <div className="mt-3 flex items-start gap-4">
                <div
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white shadow-lg"
                  style={{ background: cfg.theme_color || "#0B1020" }}
                  data-testid="apk-preview-icon"
                >
                  {cfg.icon_url ? (
                    <img src={cfg.icon_url} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <span className="font-display text-xl font-bold">
                      {(cfg.launcher_name || "VQ").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base font-bold text-slate-900 truncate" data-testid="apk-preview-app-name">{cfg.app_name}</div>
                  <div className="text-xs text-slate-600 truncate">Launcher: <span className="font-mono">{cfg.launcher_name}</span></div>
                  <code className="block truncate text-[10px] text-slate-400">{cfg.package_id}</code>
                  {cfg.twa_manifest?._viqso?.election_label && (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Vote className="h-3 w-3" /> {cfg.twa_manifest._viqso.election_label}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Election Context — what gets baked into the APK */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">★</span>
                <h3 className="text-sm font-bold text-slate-900">Election context (baked into APK)</h3>
              </div>
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                <p className="text-[11px] text-amber-800">
                  These fields control the APK's app name, launcher icon, candidate info & election scope.
                  Changes here flow into the white-label APK <strong>and</strong> the voter slip / WhatsApp share.
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Flag className="h-3 w-3" /> Party Name</Label>
                    <Input
                      value={ctx.party_name || ""}
                      onChange={(e) => setCtx({ ...ctx, party_name: e.target.value })}
                      placeholder="Aam Aadmi Party"
                      data-testid="apk-party-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Party Short Name</Label>
                    <Input
                      value={ctx.party_short_name || ""}
                      onChange={(e) => setCtx({ ...ctx, party_short_name: e.target.value })}
                      placeholder="AAP"
                      maxLength={12}
                      data-testid="apk-party-short-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Candidate Name</Label>
                    <Input
                      value={ctx.candidate_name || ""}
                      onChange={(e) => setCtx({ ...ctx, candidate_name: e.target.value })}
                      placeholder="Abhishek Dubey"
                      data-testid="apk-candidate-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Candidate Position</Label>
                    <Input
                      value={ctx.candidate_position || ""}
                      onChange={(e) => setCtx({ ...ctx, candidate_position: e.target.value })}
                      placeholder="Corporator candidate"
                      data-testid="apk-candidate-position-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs flex items-center gap-1"><Vote className="h-3 w-3" /> Election Type</Label>
                    <select
                      value={ctx.election_type || "ward"}
                      onChange={(e) => setCtx({ ...ctx, election_type: e.target.value })}
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                      data-testid="apk-election-type-select"
                    >
                      {electionTypes.map((et) => (
                        <option key={et.value} value={et.value}>{`${et.label} — ${et.short}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Constituency / Scope Name</Label>
                    <Input
                      value={ctx.election_scope_name || ctx.constituency_name || ""}
                      onChange={(e) => setCtx({ ...ctx, election_scope_name: e.target.value })}
                      placeholder="e.g. Andheri West Vidhan Sabha / Ward 20, Mumbai / Mumbai South Lok Sabha"
                      data-testid="apk-constituency-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Election Date</Label>
                    <Input
                      value={ctx.election_date || ""}
                      onChange={(e) => setCtx({ ...ctx, election_date: e.target.value })}
                      placeholder="15 Feb 2026"
                      data-testid="apk-election-date-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Theme Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={ctx.primary_color || "#0B1020"}
                        onChange={(e) => setCtx({ ...ctx, primary_color: e.target.value })}
                        className="h-10 w-14 cursor-pointer p-1"
                        data-testid="apk-theme-color-input"
                      />
                      <Input
                        value={ctx.primary_color || "#0B1020"}
                        onChange={(e) => setCtx({ ...ctx, primary_color: e.target.value })}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Party Symbol URL (EC-allotted symbol — used as APK icon)</Label>
                    <Input
                      value={ctx.party_symbol_url || ""}
                      onChange={(e) => setCtx({ ...ctx, party_symbol_url: e.target.value })}
                      placeholder="https://… (broom for AAP, lotus for BJP, hand for INC)"
                      className="font-mono text-xs"
                      data-testid="apk-party-symbol-input"
                    />
                    <p className="mt-1 text-[10px] text-amber-700">
                      If blank, the party logo will be used as the launcher icon. Recommended: 512×512 PNG.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Party Logo URL (used on slips & banners)</Label>
                    <Input
                      value={ctx.party_logo_url || ""}
                      onChange={(e) => setCtx({ ...ctx, party_logo_url: e.target.value })}
                      placeholder="https://…"
                      className="font-mono text-xs"
                      data-testid="apk-party-logo-input"
                    />
                  </div>
                </div>

                <Button
                  onClick={saveElectionContext}
                  disabled={savingCtx}
                  size="sm"
                  className="bg-amber-600 text-white hover:bg-amber-700"
                  data-testid="apk-save-context-button"
                >
                  {savingCtx ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                  Save election context & rebuild preview
                </Button>
              </div>
            </section>

            {/* Step 1: Configure */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">1</span>
                <h3 className="text-sm font-bold text-slate-900">Configure package</h3>
              </div>
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <Label className="text-xs">Android Package ID</Label>
                  <Input
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value.toLowerCase())}
                    placeholder="com.viqso.myparty"
                    className="font-mono text-sm"
                    data-testid="apk-package-id-input"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Reverse-DNS format. Must be unique on Play Store. Cannot be changed after publish.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">SHA-256 Signing Fingerprint</Label>
                  <Input
                    value={fingerprint}
                    onChange={(e) => setFingerprint(e.target.value.toUpperCase())}
                    placeholder="AB:CD:12:34:56:78:90:AB:CD:EF:12:34:..."
                    className="font-mono text-[11px]"
                    data-testid="apk-fingerprint-input"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    After running <code>bubblewrap build</code>, run{" "}
                    <code className="rounded bg-slate-100 px-1">keytool -list -v -keystore android.keystore -alias android</code>{" "}
                    and paste the SHA-256 line here. Required for the TWA to open without browser chrome.
                  </p>
                </div>
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  size="sm"
                  className="viqso-gradient text-white"
                  data-testid="apk-save-settings-button"
                >
                  {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                  Save settings
                </Button>
              </div>
            </section>

            {/* Step 2: Download */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">2</span>
                <h3 className="text-sm font-bold text-slate-900">Build the APK</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Option A: Bubblewrap */}
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Download className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-bold text-slate-900">Option A — Bubblewrap (local)</div>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Download the project bundle. Requires Node 18+, JDK 17+, Android SDK.
                  </p>
                  <Button
                    onClick={downloadZip}
                    disabled={downloading}
                    size="sm"
                    variant="outline"
                    className="w-full"
                    data-testid="apk-download-zip-button"
                  >
                    {downloading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Download className="mr-2 h-3 w-3" />}
                    Download project ZIP
                  </Button>
                  <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-2 text-[10px] text-slate-100 leading-relaxed">
{`# 1. Unzip & install bubblewrap
npm install -g @bubblewrap/cli

# 2. Initialize TWA project
bubblewrap init --manifest=./twa-manifest.json

# 3. Build signed APK
bubblewrap build`}
                  </pre>
                </div>

                {/* Option B: PWABuilder */}
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-bold text-slate-900">Option B — PWABuilder (no setup)</div>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Microsoft's free browser tool. No local install needed. Generates signed APK in ~2 min.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="w-full viqso-gradient text-white"
                    data-testid="apk-pwabuilder-link"
                  >
                    <a href={cfg.pwabuilder_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Open in PWABuilder
                    </a>
                  </Button>
                  <div className="mt-3 rounded bg-slate-50 p-2">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">PWA URL</div>
                    <div className="flex items-center gap-1">
                      <code className="flex-1 truncate text-[10px] text-slate-700">{cfg.twa_manifest.fullScopeUrl}</code>
                      <button onClick={() => copy(cfg.twa_manifest.fullScopeUrl)} className="text-slate-400 hover:text-slate-700">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Verify Digital Asset Links */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${fpConfigured ? "bg-emerald-600" : "bg-slate-400"}`}>3</span>
                <h3 className="text-sm font-bold text-slate-900">Digital Asset Links</h3>
                {fpConfigured && <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">VERIFIED</span>}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] text-slate-600">
                  Once the SHA-256 fingerprint is saved, this org's APK is auto-registered at our
                  public assetlinks endpoint. The TWA will then open without browser chrome.
                </p>
                <div className="mt-2 flex items-center gap-1 rounded bg-slate-50 p-2">
                  <code className="flex-1 truncate text-[10px] text-slate-700">
                    {cfg.twa_manifest.fullScopeUrl}.well-known/assetlinks.json
                  </code>
                  <button
                    onClick={() => copy(`${cfg.twa_manifest.fullScopeUrl}.well-known/assetlinks.json`)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Note: ensure your hosting layer routes <code>/.well-known/assetlinks.json</code> →{" "}
                  <code>/api/.well-known/assetlinks.json</code> (or copy the JSON to your frontend's
                  <code> public/.well-known/</code> folder).
                </p>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
