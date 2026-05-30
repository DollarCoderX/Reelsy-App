import { useState, useEffect } from "react";

export type IPStatus = {
  loading: boolean;
  blocked: boolean;
  reason: "vpn" | "country" | null;
  countryCode: string | null;
  countryName: string | null;
  currency: string | null; // ISO-like: USD, NGN, etc.
};


export type IPRestrictionHook = IPStatus & {
  checkConnection: () => Promise<boolean>;
};

const BLOCKED_COUNTRIES = ["KP", "GH", "IN", "HK", "NL"]; // North Korea, Ghana, India, Hong Kong, Netherlands

export function useIPRestriction(): IPRestrictionHook {
  const [status, setStatus] = useState<IPStatus>({
    loading: false,
    blocked: false,
    reason: null,
    countryCode: null,
    countryName: null,
    currency: null,
  });


  const COUNTRY_TO_CURRENCY: Record<string, string> = {
    // minimal set; extend as needed
    US: "USD",
    CA: "USD",
    GB: "GBP",
    IE: "EUR",
    NG: "NGN",
    GH: "GHS",
    KE: "KES",
    TZ: "TZS",
    UG: "UGX",
    ZA: "ZAR",
    EG: "EGP",
    MA: "MAD",
    SN: "XOF",
    CM: "XAF",
    IN: "INR",
    PK: "PKR",
    BD: "BDT",
    LK: "LKR",
    BR: "BRL",
    MX: "MXN",
    CO: "COP",
    AR: "ARS",
    CL: "CLP",
    AU: "AUD",
    NZ: "NZD",
  };

  const currencyFromCountryCode = (cc: string | null | undefined): string | null => {
    if (!cc) return null;
    return COUNTRY_TO_CURRENCY[String(cc).toUpperCase()] || "USD";
  };

  const checkConnection = async (): Promise<boolean> => {
    setStatus({ loading: true, blocked: false, reason: null, countryCode: null, countryName: null, currency: null });

    const applySuccess = (payload: { countryCode?: string | null; countryName?: string | null; currency?: string | null; blocked?: boolean; reason?: IPStatus["reason"] }) => {
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
      const response = await fetch("https://ipwho.is/");
      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          const countryCode = data.country_code || null;
          const countryName = data.country || null;
          const currency = currencyFromCountryCode(countryCode);

          if (data.security && (data.security.vpn || data.security.proxy || data.security.tor)) {
            applySuccess({ blocked: true, reason: "vpn" });
            return false;
          }
          if (BLOCKED_COUNTRIES.includes(countryCode)) {
            applySuccess({ blocked: true, reason: "country", countryCode, countryName, currency });
            return false;
          }
          applySuccess({ blocked: false, reason: null, countryCode, countryName, currency });
          return true;
        }
      }
    } catch {
      // ipwho.is blocked by adblocker or network error, proceed to fallback
    }

    try {
      // Fallback to ipapi.co (doesn't check VPN, but verifies country)
      const fbResponse = await fetch("https://ipapi.co/json/");
      if (fbResponse.ok) {
        const fbData = await fbResponse.json();
        if (!fbData?.error) {
          const countryCode = fbData.country_code || null;
          const countryName = fbData.country || null;
          const currency = currencyFromCountryCode(countryCode);

          if (BLOCKED_COUNTRIES.includes(countryCode || fbData.country)) {
            applySuccess({ blocked: true, reason: "country", countryCode, countryName, currency });
            return false;
          }
          applySuccess({ blocked: false, reason: null, countryCode, countryName, currency });
          return true;
        }
      }
    } catch {
      // Both APIs failed (extreme adblocker or no internet)
    }

    // If we completely fail to detect, fail open to prevent locking out legitimate users
    setStatus({ loading: false, blocked: false, reason: null, countryCode: null, countryName: null, currency: null });
    return true;
  };


  return { ...status, checkConnection };
}
