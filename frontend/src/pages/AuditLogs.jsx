import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Shield, Activity, User } from "lucide-react";

const ACTION_LABELS = {
  pdf_import: { label: "PDF Voter Import", color: "bg-purple-100 text-purple-700" },
  excel_import: { label: "Excel Import", color: "bg-blue-100 text-blue-700" },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/audit-logs").then((r) => setLogs(r.data));
  }, []);

  return (
    <div className="space-y-6" data-testid="audit-logs-page">
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1020] p-6 md:p-8">
        <div className="brand-ring absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[#0B1020]/40" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
            <Shield className="h-3 w-3" /> Security & Compliance
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Audit <span className="viqso-gradient-text">Logs</span>
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Track every important action across your organization — who did what, when.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 p-0 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">Time</th>
                <th className="px-4 py-3 font-bold">User</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Action</th>
                <th className="px-4 py-3 font-bold">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No audit logs yet.</td></tr>
              ) : logs.map((log) => {
                const a = ACTION_LABELS[log.action] || { label: log.action, color: "bg-slate-100 text-slate-700" };
                return (
                  <tr key={log.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {new Date(log.at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{log.user_name}</div>
                      <div className="text-[11px] text-slate-500">{log.user_email}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{log.role?.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${a.color}`}>
                        {a.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {Object.entries(log.details || {}).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="mr-2">
                          <strong>{k}:</strong> {String(v).slice(0, 50)}
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
