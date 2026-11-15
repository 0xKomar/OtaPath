/**
 * useUserLocation — location bootstrap for the patient app.
 * GpsWatcher already takes real browser GPS the moment it arrives;
 * this hook is the safety net: if no real fix lands within ~6s, we
 * ask a free IP-geolocation lookup for an approximate city position
 * so missions/POIs always form around the user's actual world —
 * never a hardcoded demo city.
 */
"use client";

import { useEffect, useRef } from "react";
import { useOtaStore } from "@/store/useOtaStore";
import type { LatLng } from "./geo";

const IP_ENDPOINTS = [
  "https://ipapi.co/json/",
  "https://ipwho.is/",
];

async function ipLocate(): Promise<LatLng | null> {
  for (const url of IP_ENDPOINTS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const j = (await res.json()) as Record<string, unknown>;
      const lat = Number(j.latitude ?? j.lat);
      const lng = Number(j.longitude ?? j.lon ?? j.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    } catch {
      /* next endpoint */
    }
  }
  return null;
}

export function useUserLocation() {
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current) return;
    const t = setTimeout(() => {
      tried.current = true;
      const st = useOtaStore.getState();
      if (st.locationSource === "gps" || st.gpsActive) return; // real fix won
      void ipLocate().then((ll) => {
        if (ll) useOtaStore.getState().relocateTo(ll, "ip");
      });
    }, 6000);
    return () => clearTimeout(t);
  }, []);
}
