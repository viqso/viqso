import React from "react";

export const VIQSO_LOGO_URL =
  "https://customer-assets.emergentagent.com/job_voter-hub-8/artifacts/rg7ud3ts_0BA4CCC4-7B01-4184-9028-7E2B82C624DC.png";

export const ViqsoLogo = ({ className = "h-9 w-9", showWordmark = false }) => (
  <div className="flex items-center gap-3">
    <div className={`relative overflow-hidden rounded-xl bg-[#0B1020] ${className}`}>
      <img
        src={VIQSO_LOGO_URL}
        alt="VIQSO"
        className="h-full w-full object-cover"
        style={{ transform: "scale(1.4)" }}
      />
    </div>
    {showWordmark && (
      <div className="leading-none">
        <div className="font-display text-base font-extrabold tracking-tight viqso-gradient-text">
          VIQSO
        </div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500">
          Digital Media
        </div>
      </div>
    )}
  </div>
);

export const ViqsoWordmark = ({ size = "lg" }) => {
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
        VIQSO
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
        Digital Media
      </div>
    </div>
  );
};
