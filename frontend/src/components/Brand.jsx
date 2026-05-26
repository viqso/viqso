import React from "react";
import { useSettings } from "../context/SettingsContext";

export const useBrand = () => useSettings()?.settings;

export const ViqsoLogo = ({ className = "h-9 w-9" }) => {
  const brand = useBrand();
  const logo = brand?.logo_url;
  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#0B1020] ${className}`}>
      {logo && (
        <img
          src={logo}
          alt={brand?.party_short_name || "Logo"}
          className="h-full w-full object-cover"
          style={{ transform: "scale(1.4)" }}
        />
      )}
    </div>
  );
};

export const ViqsoWordmark = ({ size = "lg" }) => {
  const brand = useBrand();
  const cls =
    size === "xl"
      ? "text-4xl"
      : size === "lg"
      ? "text-2xl"
      : size === "md"
      ? "text-lg"
      : "text-base";
  return (
    <div className="leading-none">
      <div className={`font-display ${cls} font-extrabold tracking-tight viqso-gradient-text`}>
        {brand?.party_short_name || "VIQSO"}
      </div>
      <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {brand?.party_name?.replace(brand?.party_short_name || "", "").trim() || "Digital Media"}
      </div>
    </div>
  );
};

export const useLogoUrl = () => useBrand()?.logo_url;

// Kept for backward compatibility imports
export const VIQSO_LOGO_URL =
  "https://customer-assets.emergentagent.com/job_voter-hub-8/artifacts/rg7ud3ts_0BA4CCC4-7B01-4184-9028-7E2B82C624DC.png";
