import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowRight, ShieldCheck, Sparkles, Users, Vote } from "lucide-react";
import { toast } from "sonner";
import { ViqsoLogo, ViqsoWordmark, VIQSO_LOGO_URL } from "../components/Brand";

const PRESETS = [
  { label: "Admin", email: "admin@crm.com", password: "admin123", accent: "from-orange-500 to-pink-500" },
  { label: "Supervisor", email: "supervisor@crm.com", password: "super123", accent: "from-purple-500 to-pink-500" },
  { label: "Field Worker", email: "worker@crm.com", password: "worker123", accent: "from-blue-500 to-purple-500" },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome to VIQSO");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail || "Login failed";
      toast.error(typeof msg === "string" ? msg : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-5 bg-white">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex lg:col-span-2 flex-col justify-between overflow-hidden bg-[#0B1020] p-12 text-white">
        {/* Decorative gradients */}
        <div className="brand-ring absolute inset-0 opacity-90" />
        <div className="absolute inset-0 bg-[#0B1020]/60" />
        <div
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #EC4899, transparent 60%)" }}
        />
        <div
          className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #1E90FF, transparent 60%)" }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center gap-3">
          <img src={VIQSO_LOGO_URL} alt="VIQSO" className="h-12 w-12 rounded-xl object-cover" style={{ transform: "scale(1)" }} />
          <ViqsoWordmark size="md" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
            <Sparkles className="h-3 w-3" /> Political CRM Platform
          </div>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight">
            Win every <br />
            <span className="viqso-gradient-text">booth.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
            Precision-built election campaign CRM by VIQSO Digital Media. Manage
            booths, run voter surveys, and command real-time analytics — all from
            one operations console.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { k: "Booths", v: "8+", c: "from-blue-500 to-purple-500" },
              { k: "Voters", v: "120+", c: "from-purple-500 to-pink-500" },
              { k: "Workers", v: "6", c: "from-pink-500 to-orange-500" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
              >
                <div className={`mb-1 h-1 w-8 rounded-full bg-gradient-to-r ${s.c}`} />
                <div className="font-display text-2xl font-bold">{s.v}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {s.k}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure session
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>Multi-role access</span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>End-to-end audit trail</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-gradient-to-br from-white via-white to-slate-50 p-6 lg:col-span-3 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <ViqsoLogo className="h-10 w-10" />
            <ViqsoWordmark size="md" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
            <Vote className="h-3 w-3" /> Sign in to console
          </div>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">
            Welcome back,<br />commander.
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Enter your VIQSO credentials to access the campaign dashboard.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@viqso.com"
                className="mt-2 h-12 rounded-lg border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 h-12 rounded-lg border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                data-testid="login-password-input"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="group relative h-12 w-full overflow-hidden rounded-lg text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/40"
              data-testid="login-submit-button"
            >
              <span className="absolute inset-0 viqso-gradient" />
              <span className="relative flex items-center justify-center font-semibold">
                {loading ? "Signing in..." : "Sign in to VIQSO"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
              <Users className="h-3 w-3" />
              Demo logins — tap to autofill
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setEmail(p.email);
                    setPassword(p.password);
                  }}
                  data-testid={`preset-${p.label.toLowerCase().replace(/\s+/g, "-")}-button`}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg"
                >
                  <div className={`absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-br ${p.accent}`} />
                  <div className="relative">
                    <div className={`mb-1.5 h-1 w-6 rounded-full bg-gradient-to-r ${p.accent}`} />
                    <div className="text-xs font-bold text-slate-900 group-hover:text-white">
                      {p.label}
                    </div>
                    <div className="text-[10px] text-slate-500 group-hover:text-white/80">
                      Tap to fill
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] uppercase tracking-[0.28em] text-slate-400">
            Connect · Create · Grow
          </div>
        </div>
      </div>
    </div>
  );
}
