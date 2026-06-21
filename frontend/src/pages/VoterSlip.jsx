import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Printer, MessageCircle, ArrowLeft, MapPin, User as UserIcon, Vote } from "lucide-react";
import { toast } from "sonner";

export default function VoterSlipPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    api.get(`/voters/${id}/slip-data`).then((r) => setData(r.data)).catch(() => toast.error("Failed to load slip"));
  }, [id]);

  if (!data) return <div className="p-10 text-slate-500">Loading slip…</div>;

  const { voter, booth, settings, org } = data;
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

  const handleWhatsApp = () => {
    if (!voter.phone) {
      toast.error("No phone number on file");
      return;
    }
    const phone = voter.phone.replace(/\D/g, "");
    const slipUrl = window.location.href;
    const tmpl =
      s.whatsapp_template ||
      `Namaste ${voter.name} ji,\n\nMain ${candidateName}, ${partyName} se ${constituency} ka ummeedwar hoon.\n\n*Aapki Voter Details:*\nNaam: ${voter.name}\nVoter ID: ${voter.voter_id_number || "—"}\nBooth: ${booth?.booth_number || ""} (${booth?.name || ""})\nPolling Station: ${booth?.location || ""}\n${electionDate ? `Election Date: ${electionDate}\n` : ""}\nDigital voter slip: ${slipUrl}\n\n${s.slip_footer_message || "Kripya apna matdaan zaroor karein."}\n\nDhanyavaad.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(tmpl)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-slip { box-shadow: none !important; border: 2px solid #0B1020 !important; margin: 0 !important; max-width: none !important; }
          @page { margin: 12mm; size: A5; }
        }
      `}</style>

      {/* Actions bar */}
      <div className="no-print mx-auto mb-4 flex max-w-2xl items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="slip-back-button">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={handleWhatsApp}
            disabled={!voter.phone}
            className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            data-testid="slip-whatsapp-button"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          <Button onClick={handlePrint} className="viqso-gradient text-white" data-testid="slip-print-button">
            <Printer className="mr-2 h-4 w-4" />
            Print Slip
          </Button>
        </div>
      </div>

      {/* The slip itself */}
      <div
        ref={printRef}
        className="print-slip mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        {/* Header band with party gradient */}
        <div
          className="relative px-6 py-5 text-white"
          style={{
            background: `linear-gradient(135deg, ${s.secondary_color || "#1E90FF"} 0%, ${s.primary_color || "#0033A0"} 50%, ${s.highlight_color || "#FFB81C"} 100%)`,
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logo && (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/95 p-1">
                  <img src={logo} alt={partyName} className="h-full w-full object-contain" />
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/80">Official Voter Slip</div>
                <div className="font-display text-xl font-extrabold tracking-tight">{partyName}</div>
                <div className="text-sm text-white/90">{constituency}</div>
              </div>
            </div>
            {candidatePhoto && (
              <div className="flex flex-col items-center gap-1">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white shadow-lg">
                  <img src={candidatePhoto} alt={candidateName} className="h-full w-full object-cover" />
                </div>
                <div className="text-center text-[10px] uppercase tracking-wider text-white/90">
                  {s.candidate_position || "Candidate"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Candidate strip */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Candidate</div>
              <div className="font-display text-lg font-bold text-slate-900">{candidateName}</div>
            </div>
            {electionDate && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Election Date</div>
                <div className="font-display text-base font-bold text-slate-900">{electionDate}</div>
              </div>
            )}
          </div>
          {s.candidate_bio && (
            <div className="mt-1 text-xs italic text-slate-600">"{s.candidate_bio}"</div>
          )}
        </div>

        {/* Voter Details */}
        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-900">
              Voter Details
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className="mt-5 rounded-lg border border-slate-300 bg-amber-50/40 p-4">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-700" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Your Polling Station
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          className="px-6 py-4 text-center text-sm font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, ${s.primary_color || "#0033A0"}, ${s.accent_color || "#FFB81C"})`,
          }}
        >
          <Vote className="mx-auto mb-1 h-5 w-5" />
          {s.slip_footer_message || "Kripya apna matdaan zaroor karein"}
        </div>

        {/* Bottom credits */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Issued by {partyName} · Powered by VIQSO Digital Media
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, value, bold, mono, cap }) => (
  <div>
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    <div
      className={[
        "mt-0.5 text-sm text-slate-900",
        bold ? "font-bold" : "",
        mono ? "font-mono" : "",
        cap ? "capitalize" : "",
      ].join(" ")}
    >
      {value}
    </div>
  </div>
);
