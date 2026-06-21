import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft, MapPin, User as UserIcon, Vote } from "lucide-react";
import { toast } from "sonner";

export default function BulkPrintSlipsPage() {
  const { boothId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/booths/${boothId}/bulk-slips-data`)
      .then((r) => {
        setData(r.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load bulk slips data");
        setLoading(false);
      });
  }, [boothId]);

  if (loading) return <div className="p-10 text-slate-500 text-center">Loading slips data...</div>;
  if (!data || !data.voters || data.voters.length === 0) {
    return (
      <div className="p-10 text-center space-y-4">
        <div className="text-slate-500">No voters found in this booth.</div>
        <Button onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      </div>
    );
  }

  const { booth, settings, org, voters } = data;
  const s = settings || {};
  const partyName = s.party_name || org?.party_name || "Party";
  const candidateName = s.candidate_name || "Candidate";
  const candidatePhoto = s.candidate_photo_url;
  const logo = s.logo_url;
  const constituency = s.constituency_name || booth?.ward || "";
  const electionDate = s.election_date || "";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-slip-container { padding: 0 !important; }
          .slip-card { 
            box-shadow: none !important; 
            border: 2px solid #000000 !important; 
            margin: 0 0 15mm 0 !important; 
            max-width: none !important;
            page-break-after: always;
            break-after: page;
          }
          @page { margin: 12mm; size: A5; }
        }
      `}</style>

      {/* Floating control bar */}
      <div className="no-print mx-auto mb-6 flex max-w-2xl items-center justify-between bg-white p-4 rounded-xl shadow-md border border-slate-200 sticky top-4 z-50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {voters.length} Slips for {booth.name}
          </span>
        </div>
        <Button onClick={handlePrint} className="viqso-gradient text-white">
          <Printer className="mr-2 h-4 w-4" /> Print All Slips
        </Button>
      </div>

      {/* Slips List */}
      <div className="print-slip-container space-y-8 max-w-2xl mx-auto pb-10">
        {voters.map((voter) => (
          <div
            key={voter.id}
            className="slip-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
          >
            {/* Header band with party gradient */}
            <div
              className="relative px-6 py-4 text-white"
              style={{
                background: `linear-gradient(135deg, ${s.secondary_color || "#1E90FF"} 0%, ${s.primary_color || "#0033A0"} 50%, ${s.highlight_color || "#FFB81C"} 100%)`,
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {logo && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/95 p-1">
                      <img src={logo} alt={partyName} className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.24em] text-white/80">Official Voter Slip</div>
                    <div className="font-display text-lg font-extrabold tracking-tight">{partyName}</div>
                    <div className="text-xs text-white/90">{constituency}</div>
                  </div>
                </div>
                {candidatePhoto && (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-md">
                      <img src={candidatePhoto} alt={candidateName} className="h-full w-full object-cover" />
                    </div>
                    <div className="text-[8px] uppercase tracking-wider text-white/90">
                      {s.candidate_position || "Candidate"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Candidate strip */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 mr-2">Candidate:</span>
                  <span className="font-display text-sm font-bold text-slate-900">{candidateName}</span>
                </div>
                {electionDate && (
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 mr-2">Vote Date:</span>
                    <span className="font-display text-xs font-bold text-slate-900">{electionDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Voter Details */}
            <div className="px-6 py-4">
              <div className="mb-2 flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-900">
                  Voter Details
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field 
                  label="Voter Name" 
                  value={
                    voter.name_en && voter.name_en !== voter.name 
                      ? `${voter.name} (${voter.name_en})` 
                      : voter.name
                  } 
                  bold 
                />
                <Field label="Voter ID (EPIC)" value={voter.voter_id_number || "—"} mono />
                <Field label="Age" value={voter.age || "—"} />
                <Field label="Gender" value={voter.gender || "—"} cap />
                <Field label="Father / Spouse" value={voter.custom_fields?.father_name || "—"} />
                <Field label="Contact" value={voter.phone || "—"} mono />
                <div className="sm:col-span-2">
                  <Field 
                    label="Residential Address" 
                    value={
                      voter.address_en && voter.address_en !== voter.address 
                        ? `${voter.address} (${voter.address_en})` 
                        : voter.address
                    } 
                  />
                </div>
              </div>

              {/* Polling station */}
              <div className="mt-4 rounded-lg border border-slate-300 bg-amber-50/40 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-700" />
                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-700">
                    Your Polling Station
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <Field label="Booth Number" value={booth?.booth_number || "—"} mono bold />
                  <Field label="Constituency" value={booth?.constituency || constituency} />
                  <div className="sm:col-span-2">
                    <Field label="Polling Station" value={booth?.name || "—"} bold />
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Address" value={booth?.location || "—"} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer message */}
            <div
              className="px-6 py-3 text-center text-xs font-semibold text-white flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${s.primary_color || "#0033A0"}, ${s.accent_color || "#FFB81C"})`,
              }}
            >
              <Vote className="h-4 w-4" />
              <span>{s.slip_footer_message || "Kripya apna matdaan zaroor karein"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const Field = ({ label, value, bold, mono, cap }) => (
  <div>
    <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    <div
      className={[
        "mt-0.5 text-xs text-slate-900",
        bold ? "font-bold" : "",
        mono ? "font-mono" : "",
        cap ? "capitalize" : "",
      ].join(" ")}
    >
      {value}
    </div>
  </div>
);
