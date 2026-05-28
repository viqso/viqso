import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  MapPin,
  Users,
  ClipboardList,
  BarChart3,
  Shield,
  LogOut,
  CalendarCheck,
  Layers,
  Home,
  Upload,
  Tv,
  ScrollText,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { ViqsoWordmark } from "../components/Brand";
import { useSettings } from "../context/SettingsContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "campaign_manager", "supervisor", "booth_president", "worker", "survey_agent", "data_operator", "viewer"] },
  { to: "/booths", label: "Booths", icon: MapPin, roles: ["admin", "campaign_manager", "supervisor", "booth_president", "worker", "survey_agent", "viewer"] },
  { to: "/voters", label: "Voters", icon: Users, roles: ["admin", "campaign_manager", "supervisor", "booth_president", "worker", "survey_agent", "viewer", "data_operator"] },
  { to: "/survey/new", label: "New Survey", icon: ClipboardList, roles: ["admin", "campaign_manager", "supervisor", "booth_president", "worker", "survey_agent"] },
  { to: "/segregate", label: "Segregate", icon: Layers, roles: ["admin", "campaign_manager", "supervisor", "viewer"] },
  { to: "/families", label: "Families", icon: Home, roles: ["admin", "campaign_manager", "supervisor", "viewer"] },
  { to: "/visits", label: "Visits", icon: CalendarCheck, roles: ["admin", "campaign_manager", "supervisor", "booth_president", "worker"] },
  { to: "/import", label: "Import Data", icon: Upload, roles: ["admin", "campaign_manager", "supervisor", "data_operator"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "campaign_manager", "supervisor", "viewer"] },
  { to: "/war-room", label: "War Room", icon: Tv, roles: ["admin", "campaign_manager", "supervisor"] },
  { to: "/audit", label: "Audit Logs", icon: ScrollText, roles: ["admin", "campaign_manager"] },
  { to: "/admin", label: "Admin Panel", icon: Shield, roles: ["admin"] },
];

const ROLE_LABEL = {
  admin: "Administrator",
  campaign_manager: "Campaign Manager",
  supervisor: "Supervisor",
  booth_president: "Booth President",
  worker: "Booth Worker",
  survey_agent: "Survey Agent",
  data_operator: "Data Operator",
  viewer: "Viewer / Analyst",
};

const ROLE_BADGE_STYLE = {
  admin: "from-orange-500 to-pink-500",
  campaign_manager: "from-purple-600 to-pink-600",
  supervisor: "from-purple-500 to-pink-500",
  booth_president: "from-cyan-500 to-blue-500",
  worker: "from-blue-500 to-purple-500",
  survey_agent: "from-emerald-500 to-blue-500",
  data_operator: "from-slate-500 to-slate-700",
  viewer: "from-slate-400 to-slate-500",
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  const items = navItems.filter((i) => i.roles.includes(user.role));

  const initials = user.name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Demo / Subscription banner */}
      {user.is_demo && (
        <div className="fixed top-0 left-0 right-0 z-50 viqso-gradient py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-md" data-testid="demo-banner">
          {user.watermark || "DEMO PREVIEW"} · For demonstration only
          {user.demo_expires_at && <span className="ml-2 opacity-80">· Expires {new Date(user.demo_expires_at).toLocaleDateString()}</span>}
        </div>
      )}
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white"
        data-testid="sidebar"
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt={settings.party_short_name} className="h-11 w-11 rounded-lg object-cover" />
          )}
          <ViqsoWordmark size="md" />
        </div>

        <nav className="flex-1 space-y-1 p-3 pl-6" data-testid="sidebar-nav">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                data-testid={`nav-link-${it.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive ? "sidebar-link-active" : "sidebar-link"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarFallback className="viqso-gradient text-xs font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900" data-testid="sidebar-user-name">
                {user.name}
              </div>
              <div className="truncate text-[11px] text-slate-500">{user.email}</div>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt={settings.party_short_name} className="h-8 w-8 rounded-lg object-cover" />
            )}
            <span className="font-display font-extrabold viqso-gradient-text text-base">{settings?.party_short_name || "VIQSO"}</span>
          </div>
          <div className="hidden md:block">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              {settings?.party_name || "VIQSO Digital Media"} · Campaign Command
            </div>
            <div className="font-display text-lg font-semibold text-slate-900">
              Welcome back, <span className="viqso-gradient-text">{user.name.split(" ")[0]}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.org_name && (
              <div className="hidden sm:block rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px]">
                <div className="font-bold uppercase tracking-wider text-slate-500">Org</div>
                <div className="font-mono text-slate-900">{user.org_name}</div>
              </div>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1 text-[11px] font-bold text-white shadow-sm ${ROLE_BADGE_STYLE[user.role]}`}
              data-testid="role-badge"
            >
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
          data-testid="mobile-bottom-nav"
        >
          {items.slice(0, 5).map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 text-[10px] ${
                    isActive ? "viqso-gradient-text font-bold" : "text-slate-500"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8" data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
