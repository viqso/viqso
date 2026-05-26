import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const SettingsContext = createContext(null);

const DEFAULTS = {
  party_name: "VIQSO Digital Media",
  party_short_name: "VIQSO",
  tagline: "Connect · Create · Grow",
  logo_url:
    "https://customer-assets.emergentagent.com/job_voter-hub-8/artifacts/rg7ud3ts_0BA4CCC4-7B01-4184-9028-7E2B82C624DC.png",
  primary_color: "#8B5CF6",
  secondary_color: "#1E90FF",
  accent_color: "#EC4899",
  highlight_color: "#F97316",
  campaign_slogan: "Win every booth",
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const apply = (s) => {
    const root = document.documentElement;
    root.style.setProperty("--viqso-blue", s.secondary_color || DEFAULTS.secondary_color);
    root.style.setProperty("--viqso-purple", s.primary_color || DEFAULTS.primary_color);
    root.style.setProperty("--viqso-pink", s.accent_color || DEFAULTS.accent_color);
    root.style.setProperty("--viqso-orange", s.highlight_color || DEFAULTS.highlight_color);

    if (s.party_short_name) {
      document.title = `${s.party_short_name} — Voter CRM`;
    }
  };

  const refresh = async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings({ ...DEFAULTS, ...data });
      apply({ ...DEFAULTS, ...data });
    } catch {
      apply(DEFAULTS);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const update = async (patch) => {
    const { data } = await api.put("/settings", patch);
    setSettings({ ...DEFAULTS, ...data });
    apply({ ...DEFAULTS, ...data });
    return data;
  };

  return (
    <SettingsContext.Provider value={{ settings, loaded, refresh, update }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
