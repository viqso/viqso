import React, { useState } from "react";
import api, { API } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

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
