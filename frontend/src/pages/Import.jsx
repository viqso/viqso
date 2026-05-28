import React, { useState } from "react";
import api, { API } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBooth, setPdfBooth] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);

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
    if (!pdfFile) {
      toast.error("Select a PDF first");
      return;
    }
    if (!pdfBooth.trim()) {
      toast.error("Enter target booth number");
      return;
    }
    setPdfUploading(true);
    setPdfResult(null);
    try {
      const form = new FormData();
      form.append("file", pdfFile);
      const { data } = await api.post(`/import/voters-pdf?booth_number=${encodeURIComponent(pdfBooth.trim())}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPdfResult(data);
      toast.success(`PDF processed: ${data.inserted} voters imported`);
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
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Beta
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Upload an Election Commission electoral roll PDF (text-based). System auto-extracts Voter Name, EPIC, Age, Gender, House Number.
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
              disabled={!pdfFile || pdfUploading}
              className="group relative h-10 overflow-hidden rounded-md text-white shadow-md"
              data-testid="pdf-upload-button"
            >
              <span className="absolute inset-0 viqso-gradient" />
              <span className="relative flex items-center font-semibold">
                {pdfUploading ? "Processing…" : "Extract & Import"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Button>
          </div>
          {pdfResult && (
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="pdf-result">
              <Stat k="Pages Processed" v={pdfResult.pages_processed} />
              <Stat k="Blocks Detected" v={pdfResult.blocks_detected} />
              <Stat k="Voters Imported" v={pdfResult.inserted} highlight />
              <Stat k="Skipped" v={pdfResult.skipped} />
              {pdfResult.errors?.length > 0 && (
                <div className="col-span-full mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <strong>{pdfResult.errors.length} parse errors</strong> — review and re-run with cleaner PDF if needed.
                </div>
              )}
            </div>
          )}
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <strong>Tip:</strong> Works best on text-based EC PDFs. Scanned-image PDFs require OCR (coming soon). For best accuracy, also try the Excel template above.
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
