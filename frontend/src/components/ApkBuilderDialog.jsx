import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Smartphone, Download, ExternalLink, Copy, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// White-label APK Builder — generates a Bubblewrap TWA project ZIP per org.
// Super-admin downloads it, runs `bubblewrap build` locally to get a signed APK.
export default function ApkBuilderDialog({ org, superKey, open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [packageId, setPackageId] = useState("");
  const [fingerprint, setFingerprint] = useState("");

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
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to load APK config");
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
      toast.error(err?.response?.data?.detail || err?.message || "Save failed");
    } finally {
      setSaving(false);
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
      // axios with responseType=blob returns error body as blob too — try to read it as text
      let detail = err?.message || "Download failed";
      const errBlob = err?.response?.data;
      if (errBlob && typeof errBlob.text === "function") {
        try {
          const t = await errBlob.text();
          detail = JSON.parse(t).detail || detail;
        } catch { /* keep default */ }
      }
      toast.error(detail);
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
            {/* Live preview */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">App Preview</div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md"
                  style={{ background: cfg.theme_color || "#0B1020" }}
                >
                  <span className="font-display text-lg font-bold">
                    {(cfg.launcher_name || "VQ").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-display text-base font-bold text-slate-900">{cfg.launcher_name}</div>
                  <code className="text-xs text-slate-500">{cfg.package_id}</code>
                </div>
              </div>
            </div>

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
