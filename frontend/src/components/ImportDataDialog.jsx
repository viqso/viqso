import React, { useState, useEffect, useRef } from "react";
import api from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import {
  Upload, FileSpreadsheet, FileText, Download, Loader2, CheckCircle2, AlertCircle, ScanText, Database, Building2, MapPin,
} from "lucide-react";
import { toast } from "sonner";

// Per-org voter data import dialog — opened from the SuperAdmin org cards.
// Supports BOTH Excel bulk upload AND scanned EC PDF (with auto-booth detection from page headers).
export default function ImportDataDialog({ org, superKey, open, onOpenChange }) {
  const [tab, setTab] = useState("pdf");
  // Excel state
  const [xlsxFile, setXlsxFile] = useState(null);
  const [xlsxUploading, setXlsxUploading] = useState(false);
  const [xlsxResult, setXlsxResult] = useState(null);
  // PDF state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBooth, setPdfBooth] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);
  const [forceOcr, setForceOcr] = useState(true); // EC PDFs are usually scanned
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfJob, setPdfJob] = useState(null);
  const pollRef = useRef(null);

  const superHeaders = { "X-Super-Admin-Key": superKey };
  const orgParam = `target_org_id=${encodeURIComponent(org?.id || "")}`;

  // Reset on open / org change
  useEffect(() => {
    if (open) {
      setXlsxFile(null); setXlsxResult(null);
      setPdfFile(null); setPdfBooth(""); setPdfJob(null);
      setAutoDetect(true); setForceOcr(true);
    }
  }, [open, org?.id]);

  // Poll PDF job
  useEffect(() => {
    if (!pdfJob?.id || pdfJob.status === "completed" || pdfJob.status === "failed") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/import/voters-pdf/jobs/${pdfJob.id}?${orgParam}`, { headers: superHeaders });
        setPdfJob(data);
        if (data.status === "completed") toast.success(`Imported ${data.inserted} voters · ${data.booths_auto_created?.length || 0} booths auto-created`);
        if (data.status === "failed") toast.error(`Import failed: ${data.error || "unknown"}`);
      } catch { /* keep polling */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line
  }, [pdfJob?.id, pdfJob?.status]);

  const uploadXlsx = async () => {
    if (!xlsxFile) { toast.error("Select an Excel file"); return; }
    setXlsxUploading(true); setXlsxResult(null);
    try {
      const form = new FormData();
      form.append("file", xlsxFile);
      const { data } = await api.post(`/import/voters?${orgParam}`, form, {
        headers: { ...superHeaders, "Content-Type": "multipart/form-data" },
      });
      setXlsxResult(data);
      toast.success(`Excel processed: ${data.inserted + data.updated} voters`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally { setXlsxUploading(false); }
  };

  const uploadPdf = async () => {
    if (!pdfFile) { toast.error("Select a PDF"); return; }
    if (!autoDetect && !pdfBooth.trim()) { toast.error("Provide booth number OR enable auto-detect"); return; }
    setPdfUploading(true); setPdfJob(null);
    try {
      const form = new FormData();
      form.append("file", pdfFile);
      const qs = [
        orgParam,
        `force_ocr=${forceOcr ? "true" : "false"}`,
        `auto_detect_booths=${autoDetect ? "true" : "false"}`,
        autoDetect ? "" : `booth_number=${encodeURIComponent(pdfBooth.trim())}`,
      ].filter(Boolean).join("&");
      const { data } = await api.post(`/import/voters-pdf?${qs}`, form, {
        headers: { ...superHeaders, "Content-Type": "multipart/form-data" },
      });
      setPdfJob({ id: data.job_id, status: data.status, total_pages: 0, pages_processed: 0, inserted: 0, failed_count: 0, progress_percent: 0, booths_auto_created: [], headers_detected: [] });
      toast.info("Queued — processing in background…");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "PDF import failed");
    } finally { setPdfUploading(false); }
  };

  const dlTemplate = async () => {
    try {
      const res = await api.get("/import/template", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = "voter_upload_template.xlsx";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error("Template download failed"); }
  };

  if (!org) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto" data-testid="import-data-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import Voter Data — {org.party_name || org.name}
          </DialogTitle>
          <DialogDescription>
            Super-Admin only. Import voter rolls for this client. Use the Election Commission PDF tab
            for scanned EC voter lists — the system auto-detects polling-station headers per page and
            creates booths automatically. Excel is for clean, pre-formatted data.
          </DialogDescription>
        </DialogHeader>

        {/* Org badge */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <code className="text-xs text-slate-600">{org.access_key}</code>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs font-semibold text-slate-700">{org.name}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setTab("pdf")}
            className={`relative px-3 py-2 text-sm font-semibold transition-colors ${tab === "pdf" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            data-testid="import-tab-pdf"
          >
            <FileText className="mr-1.5 inline h-4 w-4" /> EC PDF (scanned)
            {tab === "pdf" && <span className="absolute bottom-0 left-0 h-0.5 w-full viqso-gradient" />}
          </button>
          <button
            onClick={() => setTab("xlsx")}
            className={`relative px-3 py-2 text-sm font-semibold transition-colors ${tab === "xlsx" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            data-testid="import-tab-xlsx"
          >
            <FileSpreadsheet className="mr-1.5 inline h-4 w-4" /> Excel (.xlsx)
            {tab === "xlsx" && <span className="absolute bottom-0 left-0 h-0.5 w-full viqso-gradient" />}
          </button>
        </div>

        {tab === "pdf" && (
          <div className="space-y-4">
            {/* Auto-detect toggle */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={(e) => setAutoDetect(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-emerald-400"
                  data-testid="pdf-auto-detect-checkbox"
                />
                <span className="text-sm">
                  <strong className="text-emerald-900">Auto-detect booths from page headers</strong>
                  <span className="block text-[11px] text-emerald-700">
                    Recommended for EC PDFs. The system reads Vidhan Sabha, Polling Station No., Ward, Section,
                    Address from each page's header and auto-creates booths. Voters are mapped to the correct
                    booth automatically.
                  </span>
                </span>
              </label>
            </div>

            {!autoDetect && (
              <div>
                <Label className="text-xs">Booth Number (manual override) *</Label>
                <Input
                  value={pdfBooth}
                  onChange={(e) => setPdfBooth(e.target.value)}
                  placeholder="e.g. B-2001 (all voters go into this single booth)"
                  className="font-mono"
                  data-testid="pdf-booth-input"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <label
                className="flex h-11 cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:border-purple-400 hover:bg-purple-50/30"
                data-testid="pdf-drop-zone"
              >
                <Upload className="h-4 w-4" />
                {pdfFile ? pdfFile.name : "Select EC voter list PDF (multi-page supported)"}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => setPdfFile(e.target.files[0])}
                  data-testid="pdf-file-input"
                />
              </label>
              <Button
                onClick={uploadPdf}
                disabled={!pdfFile || pdfUploading || (pdfJob && pdfJob.status === "processing")}
                className="group relative h-11 overflow-hidden rounded-md text-white shadow-md"
                data-testid="pdf-upload-button"
              >
                <span className="absolute inset-0 viqso-gradient" />
                <span className="relative flex items-center font-semibold">
                  {pdfUploading ? "Queuing…" : "Extract & Import"}
                </span>
              </Button>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                checked={forceOcr}
                onChange={(e) => setForceOcr(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-400"
                data-testid="pdf-force-ocr-checkbox"
              />
              <ScanText className="h-3.5 w-3.5 text-slate-500" />
              <span>Force OCR (use for scanned EC PDFs; ~3-5s per page)</span>
            </label>

            {/* Job progress */}
            {pdfJob && (
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4" data-testid="pdf-job-progress">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pdfJob.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : pdfJob.status === "failed" ? <AlertCircle className="h-4 w-4 text-red-600" />
                      : <Loader2 className="h-4 w-4 animate-spin text-purple-600" />}
                    <span className="text-sm font-semibold text-slate-900">
                      {pdfJob.status === "completed" ? "Import complete"
                        : pdfJob.status === "failed" ? "Import failed"
                        : pdfJob.status === "processing" ? `Page ${pdfJob.pages_processed || 0} of ${pdfJob.total_pages || "?"}`
                        : "Queued…"}
                    </span>
                    {pdfJob.ocr_used && <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"><ScanText className="h-3 w-3" /> OCR</span>}
                  </div>
                  <span className="font-mono text-xs text-slate-500">{pdfJob.progress_percent || 0}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full viqso-gradient transition-all duration-500" style={{ width: `${pdfJob.progress_percent || 0}%` }} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Stat k="Pages" v={`${pdfJob.pages_processed || 0}/${pdfJob.total_pages || "—"}`} />
                  <Stat k="Voters found" v={pdfJob.blocks_detected || 0} />
                  <Stat k="Inserted" v={pdfJob.inserted || 0} highlight />
                  <Stat k="Skipped (dup)" v={pdfJob.skipped_duplicates || 0} />
                  <Stat k="Failed" v={pdfJob.failed_count || 0} />
                </div>

                {pdfJob.booths_auto_created?.length > 0 && (
                  <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50/50 p-3" data-testid="pdf-booths-created">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <Building2 className="h-3.5 w-3.5" /> {pdfJob.booths_auto_created.length} booth{pdfJob.booths_auto_created.length > 1 ? "s" : ""} auto-created from page headers
                    </div>
                    <ul className="space-y-1 text-[11px] text-emerald-900">
                      {pdfJob.booths_auto_created.slice(0, 10).map((b, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          <span><code className="font-mono font-bold">{b.booth_number}</code> · {b.name}{b.constituency ? ` · ${b.constituency}` : ""}{b.ward ? ` · Ward ${b.ward}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pdfJob.headers_detected?.length > 0 && (
                  <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3" data-testid="pdf-headers-detected">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                      View per-page header context ({pdfJob.headers_detected.length} pages)
                    </summary>
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      {pdfJob.headers_detected.map((h, i) => (
                        <div key={i} className="mt-2 rounded border border-slate-200 bg-white p-2 text-[10px]">
                          <div className="font-bold text-slate-700">Page {h.page}</div>
                          <div className="text-slate-600">
                            {h.vidhan_sabha_name && <span>Vidhan Sabha: <strong>{h.vidhan_sabha_name}</strong> · </span>}
                            {h.polling_station_no && <span>PS#{h.polling_station_no} · </span>}
                            {h.ward && <span>Ward: {h.ward} · </span>}
                            {h.part_no && <span>Part {h.part_no} · </span>}
                            {h.section_no && <span>Sec {h.section_no} · </span>}
                            {h.address_area && <span>📍 {h.address_area}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {pdfJob.failed_rows?.length > 0 && (
                  <details className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3" data-testid="pdf-failed-rows">
                    <summary className="cursor-pointer text-xs font-semibold text-amber-800">
                      {pdfJob.failed_rows.length} failed row{pdfJob.failed_rows.length > 1 ? "s" : ""}
                    </summary>
                    <ul className="mt-2 max-h-40 overflow-y-auto text-[11px] text-amber-900">
                      {pdfJob.failed_rows.map((r, i) => (
                        <li key={i}>pg {r.page} · {r.name || "—"} · {r.error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
              <strong>Pro tip:</strong> Election Commission PDFs print Vidhan Sabha, Polling Station No., Ward, Section,
              and Address on every page header. With auto-detect ON, each voter is auto-mapped to the correct booth
              and inherits this full demography context (used in voter slips, segregation, and analytics).
            </div>
          </div>
        )}

        {tab === "xlsx" && (
          <div className="space-y-4">
            <Button
              onClick={dlTemplate}
              variant="outline"
              size="sm"
              className="w-full md:w-auto"
              data-testid="xlsx-template-button"
            >
              <Download className="mr-2 h-3.5 w-3.5" /> Download .xlsx template
            </Button>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <label
                className="flex h-11 cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:border-purple-400 hover:bg-purple-50/30"
                data-testid="xlsx-drop-zone"
              >
                <Upload className="h-4 w-4" />
                {xlsxFile ? xlsxFile.name : "Drop or click to select .xlsx"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setXlsxFile(e.target.files[0])}
                  data-testid="xlsx-file-input"
                />
              </label>
              <Button
                onClick={uploadXlsx}
                disabled={!xlsxFile || xlsxUploading}
                className="group relative h-11 overflow-hidden rounded-md text-white shadow-md"
                data-testid="xlsx-upload-button"
              >
                <span className="absolute inset-0 viqso-gradient" />
                <span className="relative flex items-center font-semibold">
                  {xlsxUploading ? "Uploading…" : "Upload & process"}
                </span>
              </Button>
            </div>

            {xlsxResult && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5" data-testid="xlsx-result">
                <Stat k="Inserted" v={xlsxResult.inserted} highlight />
                <Stat k="Updated" v={xlsxResult.updated} />
                <Stat k="Skipped" v={xlsxResult.skipped} />
                <Stat k="New Booths" v={xlsxResult.created_booths} />
                <Stat k="Total Rows" v={xlsxResult.total_rows} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const Stat = ({ k, v, highlight }) => (
  <div className="rounded-md border border-slate-200 bg-white p-3">
    <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
    <div className={`mt-1 font-display text-xl font-bold ${highlight ? "viqso-gradient-text" : "text-slate-900"}`}>
      {v}
    </div>
  </div>
);
