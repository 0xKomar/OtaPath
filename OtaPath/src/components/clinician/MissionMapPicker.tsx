"use client";

/**
 * MissionMapPicker — a small Leaflet map inside the mission builder.
 * Click anywhere to drop a prescription pin, or tap a real POI chip
 * below to snap to it. Warm tiles only, no chrome.
 */

import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { DEFAULT_CENTER, type LatLng } from "@/lib/geo";
import { proceduralPois } from "@/lib/localPoiEngine";
import type { POI } from "@/lib/poi";
import { fetchPois } from "@/lib/overpass";

export interface PickPoint {
  lat: number;
  lng: number;
  poiName: string;
  tier: "nature" | "culture" | "sport";
}

const TILE =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

const TIER_HEX = { nature: "#1E8E5A", culture: "#2563EB", sport: "#FF6B2B" } as const;

export function MissionMapPicker({
  value,
  onPick,
  center,
}: {
  value: PickPoint | null;
  onPick: (p: PickPoint) => void;
  /** the patient's live position — POIs + the map anchor around them */
  center?: LatLng;
}) {
  const c = center ?? DEFAULT_CENTER;
  const [pois, setPois] = useState<POI[]>(() => proceduralPois(c));
  const [custom, setCustom] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let dead = false;
    void fetchPois(c[0], c[1]).then((r) => {
      if (!dead && r.pois.length) setPois(r.pois);
    });
    return () => {
      dead = true;
    };
  }, [c]);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border-2 border-stone-900/10">
        <MapContainer
          key={`${c[0].toFixed(4)},${c[1].toFixed(4)}`}
          center={c}
          zoom={16}
          scrollWheelZoom={false}
          attributionControl={false}
          className="h-52 w-full"
          style={{ background: "#FBE8A6" }}
        >
          <TileLayer url={TILE} />
          {/* the patient's own position — prescriptions anchor around them */}
          <CircleMarker
            center={c}
            radius={7}
            pathOptions={{ color: "#FF6B2B", weight: 3, fillColor: "#FFCE32", fillOpacity: 1 }}
          />
          <ClickCatcher
            onPick={(lat, lng) => {
              setCustom({ lat, lng });
              onPick({ lat, lng, poiName: "a custom spot", tier: "nature" });
            }}
          />
          {pois.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={value?.poiName === p.name ? 8 : 5}
              pathOptions={{
                color: "#1C1917",
                weight: value?.poiName === p.name ? 2 : 1,
                fillColor: TIER_HEX[p.tier],
                fillOpacity: value?.poiName === p.name ? 1 : 0.75,
              }}
              eventHandlers={{
                click: () => {
                  setCustom(null);
                  onPick({ lat: p.lat, lng: p.lng, poiName: p.name, tier: p.tier });
                },
              }}
            />
          ))}
          {custom && (
            <CircleMarker
              center={[custom.lat, custom.lng]}
              radius={9}
              pathOptions={{ color: "#1C1917", weight: 2, fillColor: "#F472B6", fillOpacity: 1 }}
            />
          )}
        </MapContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pois.slice(0, 8).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setCustom(null);
              onPick({ lat: p.lat, lng: p.lng, poiName: p.name, tier: p.tier });
            }}
            className={`rounded-full border-b-2 px-2.5 py-1 font-sans text-[10px] font-bold transition-transform active:scale-95 ${
              value?.poiName === p.name
                ? "border-stone-900/20 bg-solar text-ink-charcoal"
                : "border-stone-900/10 bg-cream text-ink-charcoal/60"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
