import React, { useState, useRef, useEffect } from "react";
import api, { API } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, FileText, ScanText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBooth, setPdfBooth] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [forceOcr, setForceOcr] = useState(false);
  const [pdfJob, setPdfJob] = useState(null);
  const pollRef = useRef(null);

  // Poll job status while it's processing
  useEffect(() => {
    if (!pdfJob?.id || pdfJob.status === "completed" || pdfJob.status === "failed") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/import/voters-pdf/jobs/${pdfJob.id}`);
        setPdfJob(data);
        if (data.status === "completed") {
          toast.success(`OCR import done: ${data.inserted} voters imported`);
        } else if (data.status === "failed") {
          toast.error(`Import failed: ${data.error || "unknown error"}`);
        }
      } catch (err) {
        // keep polling on transient errors
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pdfJob?.id, pdfJob?.status]);

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/import/template`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "voter_upload_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (e) {
      toast.error("Failed to download template");
    }
  };

  const upload = async () => {
    if (!file) {
      toast.error("Select a file first");
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/import/voters", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      toast.success(`Upload complete: ${data.inserted + data.updated} processed`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadPdf = async () => {
    if (!pdfFile) { toast.error("Select a PDF first"); return; }
    if (!pdfBooth.trim()) { toast.error("Enter target booth number"); return; }
    setPdfUploading(true);
    setPdfJob(null);
    try {
      const form = new FormData();
      form.append("file", pdfFile);
      const qs = `?booth_number=${encodeURIComponent(pdfBooth.trim())}&force_ocr=${forceOcr ? "true" : "false"}`;
      const { data } = await api.post(`/import/voters-pdf${qs}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Backend returns job_id — start polling
      setPdfJob({ id: data.job_id, status: data.status, total_pages: 0, pages_processed: 0, inserted: 0, failed_count: 0, progress_percent: 0 });
      toast.info("Import queued. Processing in background…");
    } catch (err) {
      toast.error(err.response?.data?.detail || "PDF import failed");
    } finally {
      setPdfUploading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="import-page">
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1020] p-6 md:p-8">
        <div className="brand-ring absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[#0B1020]/40" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
            <FileSpreadsheet className="h-3 w-3" /> Bulk Import
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Import <span className="viqso-gradient-text">voter rolls.</span>
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Upload Excel sheets — auto-segregated by booth, ward, caste, religion. Smart-merge on voter ID.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Step 1: template */}
        <Card className="border-slate-200 p-6 shadow-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
            <Download className="h-5 w-5" />
          </div>
          <div className="mt-4 text-[10px] uppercase tracking-wider text-slate-500">Step 1</div>
          <h3 className="font-display text-lg font-bold text-slate-900">Download template</h3>
          <p className="mt-1 text-sm text-slate-500">
            Use our standard XLSX template with sample data and instructions.
          </p>
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="mt-4 w-full"
            data-testid="download-template-button"
          >
            <Download className="mr-2 h-4 w-4" />
            Download .xlsx
          </Button>
        </Card>

        {/* Step 2: fill */}
        <Card className="border-slate-200 p-6 shadow-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="mt-4 text-[10px] uppercase tracking-wider text-slate-500">Step 2</div>
          <h3 className="font-display text-lg font-bold text-slate-900">Fill voter data</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add rows for each voter. Required: <code className="rounded bg-slate-100 px-1 text-[11px]">name</code>. Use booth_number to assign — new booths auto-create.
          </p>
          <div className="mt-4 text-xs text-slate-500">
            Tip: Include voter_id_number for smart-merge updates.
          </div>
        </Card>

        {/* Step 3: upload */}
        <Card className="border-slate-200 p-6 shadow-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 text-white">
            <Upload className="h-5 w-5" />
          </div>
          <div className="mt-4 text-[10px] uppercase tracking-wider text-slate-500">Step 3</div>
          <h3 className="font-display text-lg font-bold text-slate-900">Upload sheet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Voters auto-segregated by ward, booth, caste, religion, surname & family.
          </p>
          <label
            className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-4 text-center transition-colors hover:border-purple-400 hover:bg-purple-50/30"
            data-testid="file-drop-zone"
          >
            <Upload className="h-5 w-5 text-slate-400" />
            <span className="text-xs font-medium text-slate-700">
              {file ? file.name : "Drop or click to select .xlsx"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
              data-testid="file-input"
            />
          </label>
          <Button
            onClick={upload}
            disabled={!file || uploading}
            className="group relative mt-3 h-10 w-full overflow-hidden rounded-lg text-white shadow-lg shadow-purple-500/30"
            data-testid="upload-submit-button"
          >
            <span className="absolute inset-0 viqso-gradient" />
            <span className="relative flex items-center justify-center font-semibold">
              {uploading ? "Uploading…" : "Upload & process"}
              {!uploading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </span>
          </Button>
        </Card>
      </div>

      {/* PDF Import Section */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md viqso-gradient text-white">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Election Commission PDF Import
          </h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            OCR Enabled
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Upload an EC electoral roll PDF — text-based or scanned. The system auto-detects scanned pages and runs Tesseract OCR
          (Hindi + English) to extract Voter Name, Father/Husband, Age, Gender, House No., EPIC. Multi-page booth PDFs supported.
        </p>
        <Card className="border-slate-200 p-5 shadow-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Target Booth Number *</label>
              <input
                type="text"
                value={pdfBooth}
                onChange={(e) => setPdfBooth(e.target.value)}
                placeholder="e.g. B-2001 (will be auto-created if missing)"
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-mono"
                data-testid="pdf-booth-input"
              />
            </div>
            <label
              className="flex h-10 cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:border-purple-400 hover:bg-purple-50/30"
              data-testid="pdf-drop-zone"
            >
              <Upload className="h-4 w-4" />
              {pdfFile ? pdfFile.name.slice(0, 30) : "Select PDF"}
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
              className="group relative h-10 overflow-hidden rounded-md text-white shadow-md"
              data-testid="pdf-upload-button"
            >
              <span className="absolute inset-0 viqso-gradient" />
              <span className="relative flex items-center font-semibold">
                {pdfUploading ? "Queuing…" : "Extract & Import"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Button>
          </div>

          {/* Force OCR toggle */}
          <label className="mt-3 inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600">
            <input
              type="checkbox"
              checked={forceOcr}
              onChange={(e) => setForceOcr(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-400"
              data-testid="pdf-force-ocr-checkbox"
            />
            <ScanText className="h-3.5 w-3.5 text-slate-500" />
            <span>Force OCR (use for scanned PDFs; ~3-5s per page)</span>
          </label>

          {/* Job progress card */}
          {pdfJob && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4" data-testid="pdf-job-progress">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {pdfJob.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : pdfJob.status === "failed" ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  )}
                  <span className="text-sm font-semibold text-slate-900">
                    {pdfJob.status === "completed" ? "Import complete" :
                     pdfJob.status === "failed" ? "Import failed" :
                     pdfJob.status === "processing" ? `Processing page ${pdfJob.pages_processed || 0} of ${pdfJob.total_pages || "?"}` :
                     "Queued…"}
                  </span>
                  {pdfJob.ocr_used && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      <ScanText className="h-3 w-3" /> OCR
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-slate-500">{pdfJob.progress_percent || 0}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full viqso-gradient transition-all duration-500"
                  style={{ width: `${pdfJob.progress_percent || 0}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                <Stat k="Pages" v={`${pdfJob.pages_processed || 0}/${pdfJob.total_pages || "—"}`} />
                <Stat k="Blocks detected" v={pdfJob.blocks_detected || 0} />
                <Stat k="Inserted" v={pdfJob.inserted || 0} highlight />
                <Stat k="Skipped (dup)" v={pdfJob.skipped_duplicates || 0} />
                <Stat k="Failed" v={pdfJob.failed_count || 0} />
              </div>

              {pdfJob.status === "failed" && pdfJob.error && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <strong>Error:</strong> {pdfJob.error}
                </div>
              )}

              {pdfJob.failed_rows && pdfJob.failed_rows.length > 0 && (
                <details className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3" data-testid="pdf-failed-rows">
                  <summary className="cursor-pointer text-xs font-semibold text-amber-800">
                    View {pdfJob.failed_rows.length} failed row{pdfJob.failed_rows.length > 1 ? "s" : ""}
                  </summary>
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="text-amber-700">
                        <tr><th className="text-left">Page</th><th className="text-left">Name</th><th className="text-left">EPIC</th><th className="text-left">Error</th></tr>
                      </thead>
                      <tbody>
                        {pdfJob.failed_rows.map((r, i) => (
                          <tr key={i} className="border-t border-amber-100">
                            <td className="py-1 font-mono">{r.page}</td>
                            <td className="py-1">{r.name || <span className="text-amber-500">—</span>}</td>
                            <td className="py-1 font-mono">{r.epic || <span className="text-amber-500">—</span>}</td>
                            <td className="py-1 text-amber-700">{r.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <strong>Tip:</strong> System tries fast text extraction first. If a page has &lt; 80 characters of extractable text,
            it falls back to OCR automatically. For purely scanned PDFs, enable <em>Force OCR</em> above. Hindi + English supported.
          </div>
        </Card>
      </div>

      {/* Result */}
      {result && (
        <Card className="border-slate-200 p-6 shadow-none" data-testid="upload-result">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-display text-lg font-bold text-slate-900">Import complete</h3>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { k: "Inserted", v: result.inserted, c: "from-emerald-500 to-teal-500" },
              { k: "Updated", v: result.updated, c: "from-blue-500 to-purple-500" },
              { k: "Skipped", v: result.skipped, c: "from-amber-500 to-orange-500" },
              { k: "New Booths", v: result.created_booths, c: "from-purple-500 to-pink-500" },
              { k: "Total Rows", v: result.total_rows, c: "from-slate-500 to-slate-600" },
            ].map((s) => (
              <div key={s.k} className="rounded-lg border border-slate-200 p-3">
                <div className={`mb-1 h-1 w-8 rounded-full bg-gradient-to-r ${s.c}`} />
                <div className="font-display text-2xl font-bold text-slate-900">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{s.k}</div>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" />
                {result.errors.length} row error{result.errors.length > 1 ? "s" : ""}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-red-700">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

const Stat = ({ k, v, highlight }) => (
  <div className="rounded-md border border-slate-200 bg-white p-3">
    <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
    <div className={`mt-1 font-display text-2xl font-bold ${highlight ? "viqso-gradient-text" : "text-slate-900"}`}>
      {v}
    </div>
  </div>
);
