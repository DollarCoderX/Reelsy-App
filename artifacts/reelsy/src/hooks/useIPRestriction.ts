import { useState, useEffect } from "react";

export type IPStatus = {
  loading: boolean;
  blocked: boolean;
  reason: "vpn" | "country" | null;
  countryCode: string | null;
  countryName: string | null;
  currency: string | null;
};

export type IPRestrictionHook = IPStatus & {
  checkConnection: () => Promise<boolean>;
};

// AI is restricted to these countries only
export const AI_ALLOWED_COUNTRIES = ["US", "GB", "CA", "NG"];

// Magic link auth countries (get link instead of OTP)
export const MAGIC_LINK_COUNTRIES = ["US", "GB", "GH", "CN", "FR", "CA"];

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", CA: "USD", GB: "GBP", IE: "EUR", NG: "NGN", GH: "GHS",
  KE: "KES", TZ: "TZS", UG: "UGX", ZA: "ZAR", EG: "EGP", MA: "MAD",
  SN: "XOF", CM: "XAF", IN: "INR", PK: "PKR", BD: "BDT", LK: "LKR",
  BR: "BRL", MX: "MXN", CO: "COP", AR: "ARS", CL: "CLP", AU: "AUD", NZ: "NZD",
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", CN: "CNY",
};

export function useIPRestriction(): IPRestrictionHook {
  const [status, setStatus] = useState<IPStatus>({
    loading: false,
    blocked: false,
    reason: null,
    countryCode: null,
    countryName: null,
    currency: null,
  });

  const currencyFromCountryCode = (cc: string | null | undefined): string | null => {
    if (!cc) return null;
    return COUNTRY_TO_CURRENCY[String(cc).toUpperCase()] || "USD";
  };

  const checkConnection = async (): Promise<boolean> => {
    setStatus({ loading: true, blocked: false, reason: null, countryCode: null, countryName: null, currency: null });

    const applySuccess = (payload: {
      countryCode?: string | null;
      countryName?: string | null;
      currency?: string | null;
      blocked?: boolean;
      reason?: IPStatus["reason"];
    }) => {
      setStatus({
        loading: false,
        blocked: !!payload.blocked,
        reason: payload.reason ?? null,
        countryCode: payload.countryCode ?? null,
        countryName: payload.countryName ?? null,
        currency: payload.currency ?? null,
      });
    };

    try {
      // Primary: ipwho.is
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch("https://ipwho.is/", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data?.success) {
            const countryCode = data.country_code || null;
            const countryName = data.country || null;
            const currency = currencyFromCountryCode(countryCode);
            // Block VPN/proxy/tor strictly - no exceptions
            if (data.security && (data.security.vpn || data.security.proxy || data.security.tor)) {
              applySuccess({ blocked: true, reason: "vpn" });
              return false;
            }
            // All countries allowed - no country blocks
            applySuccess({ blocked: false, reason: null, countryCode, countryName, currency });
            return true;
          }
        }
      } catch { /* fallback */ }

      // Fallback: ipapi.co
      try {
        const fbController = new AbortController();
        const fbTimeoutId = setTimeout(() => fbController.abort(), 5000);
        const fbResponse = await fetch("https://ipapi.co/json/", { signal: fbController.signal });
        clearTimeout(fbTimeoutId);
        if (fbResponse.ok) {
          const fbData = await fbResponse.json();
          if (!fbData?.error) {
            const countryCode = fbData.country_code || null;
            const countryName = fbData.country_name || null;
            const currency = currencyFromCountryCode(countryCode);
            applySuccess({ blocked: false, reason: null, countryCode, countryName, currency });
            return true;
          }
        }
      } catch { /* failed */ }
    } catch { /* unexpected error */ }

    // Fail open to prevent locking out legitimate users
    setStatus({ loading: false, blocked: false, reason: null, countryCode: null, countryName: null, currency: null });
    return true;
  };

  return { ...status, checkConnection };
}
