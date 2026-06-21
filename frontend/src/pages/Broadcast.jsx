import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Send, Settings, BookOpen, Check, Play, RefreshCw, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function BroadcastPage() {
  const [booths, setBooths] = useState([]);
  const [selectedBooth, setSelectedBooth] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("https://api.wati.io/api/v1/sendTemplateMessage");
  const [token, setToken] = useState("Bearer wati_demo_token_xyz123");
  const [templateText, setTemplateText] = useState(
    "Namaste {name} ji,\n\nMain Abhishek Dubey, AAP se Ward 20 Mumbai ka corporator candidate hoon. Kripya 15 February ko Aam Aadmi Party (jhaadu nishaan) par vote zaroor karein.\n\n*Aapka digital voter slip:*\nNaam: {name}\nEPIC ID: {voter_id}\nBooth Number: {booth_num}\nPolling Station: {polling_station}\n\nDhanyavaad!"
  );
  
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [campaignSummary, setCampaignSummary] = useState(null);

  useEffect(() => {
    api.get("/booths").then((r) => {
      setBooths(r.data);
      if (r.data.length > 0) {
        setSelectedBooth(r.data[0].id);
      }
    });
  }, []);

  const handleStartBroadcast = async () => {
    if (!selectedBooth) {
      toast.error("Please select a target booth");
      return;
    }
    if (!gatewayUrl || !token) {
      toast.error("Please enter WhatsApp Gateway API credentials");
      return;
    }
    if (!templateText) {
      toast.error("Template message body cannot be empty");
      return;
    }

    setSending(true);
    setProgress(0);
    setLogs([]);
    setCampaignSummary(null);

    try {
      // Direct call to API dispatch
      const response = await api.post("/broadcast/whatsapp", {
        booth_id: selectedBooth,
        gateway_url: gatewayUrl,
        token: token,
        template_text: templateText
      });
      
      const { dispatched_count, logs: dispatchLogs } = response.data;
      
      // Simulate progress bar and incremental log printing for smooth UI feedback
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(Math.min(100, currentProgress));
        
        // Print logs gradually
        const logsToShowCount = Math.ceil((currentProgress / 100) * dispatchLogs.length);
        setLogs(dispatchLogs.slice(0, logsToShowCount));

        if (currentProgress >= 100) {
          clearInterval(interval);
          setSending(false);
          setCampaignSummary({
            dispatched: dispatched_count,
            failed: 0,
            status: "Completed successfully"
          });
          toast.success(`WhatsApp slip dispatches complete: ${dispatched_count} messages sent!`);
        }
      }, 300);

    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to trigger broadcast campaign");
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="broadcast-page">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1020] p-6 md:p-8">
        <div className="brand-ring absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[#0B1020]/40" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
            <Send className="h-3 w-3" /> Campaigns
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            WhatsApp <span className="viqso-gradient-text">Broadcast Center</span>
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Configure external API gateways (Wati, Gupshup, Twilio) and broadcast slips in one click.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Config */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gateway Credentials */}
          <Card className="border-slate-200 p-6 shadow-none space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-500" /> Gateway Configuration
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">API Gateway Endpoint</label>
                <Input
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  placeholder="https://api.gateway.com/send"
                  disabled={sending}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">API Authorization Token</label>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Bearer token_123..."
                  type="password"
                  disabled={sending}
                />
              </div>
            </div>
          </Card>

          {/* Campaign Config */}
          <Card className="border-slate-200 p-6 shadow-none space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-500" /> Campaign Details
            </h2>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Polling Booth</label>
              <Select value={selectedBooth} onValueChange={setSelectedBooth} disabled={sending}>
                <SelectTrigger className="w-full border-slate-300">
                  <SelectValue placeholder="Select Booth" />
                </SelectTrigger>
                <SelectContent>
                  {booths.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.booth_number} · {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Message Template Body</label>
                <span className="text-[10px] text-slate-400">Placeholders: {"{name}"}, {"{voter_id}"}, {"{booth_num}"}, {"{polling_station}"}</span>
              </div>
              <Textarea
                rows={6}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                placeholder="Enter template message..."
                disabled={sending}
                className="font-mono text-sm border-slate-300"
              />
            </div>

            <Button
              onClick={handleStartBroadcast}
              disabled={sending}
              className="w-full viqso-gradient text-white"
            >
              {sending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Broadcasting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 fill-current" /> Dispatch WhatsApp Slip Campaign
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Right Column: Execution Feed */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card className="border-slate-200 p-6 shadow-none space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-slate-500" /> Campaign Logs
            </h2>

            {/* Progress bar */}
            {sending && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Campaign Summary */}
            {campaignSummary && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <Check className="h-4 w-4" /> Broadcast Complete
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-emerald-700">
                  <div>Messages sent: <span className="font-mono font-bold">{campaignSummary.dispatched}</span></div>
                  <div>Failures: <span className="font-mono font-bold">{campaignSummary.failed}</span></div>
                </div>
              </div>
            )}

            {/* Live Feed Terminal */}
            <div className="h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] text-slate-600 space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-1">
                  <span className="text-slate-400">[{index + 1}]</span>
                  <div>
                    <span className="text-blue-600 font-bold">API POST</span> to <span className="text-slate-900 font-semibold">{log.phone}</span>:{" "}
                    <span className="text-emerald-600">SUCCESS</span>
                    <div className="text-slate-400 italic font-mono truncate max-w-xs">{log.message_preview}</div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && !sending && (
                <div className="text-slate-400 text-center py-20 italic">
                  Launch a campaign to monitor API dispatch calls here.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
