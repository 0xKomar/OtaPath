"use client";

/**
 * ExploreMap — OtaPath's fog-of-war neighborhood map.
 *
 * OSM Standard tiles (no key) under a warm golden-cream paper mist.
 * The mist, POI beacons, memory capsules and the CloudWalker avatar all
 * live in a single DOM overlay portaled into the map container AFTER
 * Leaflet init — deliberately NOT in Leaflet panes, so animated pans/
 * zooms can't drag the overlay out of frame.
 *
 * Mist peel: every walked point stamps a feathered radial hole into the
 * canvas; pins of the active tier glow above the mist as wayfinding
 * beacons, the rest sleep dimmed.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { LeafletContext, createLeafletContext } from "@react-leaflet/core";
import { TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { DEFAULT_CENTER, haversineM, type LatLng } from "@/lib/geo";
import { fetchFootRoute } from "@/lib/route";
import { STATE_TO_TIER, TIER_META } from "@/lib/poi";
import { memorySvgString, pinSvgString } from "@/lib/pinSvg";
import { OtaDog, type DogState } from "@/components/ui/OtaDog";
import { isEcho } from "@/lib/echo";
import { fireflyCount, fireflyDots } from "@/lib/fireflies";
import { useOtaStore } from "@/store/useOtaStore";

const FOG_BUTTER = "rgba(251, 232, 166, 0.88)"; // #FBE8A6 @ 88%
const FOG_SOLAR = "rgba(255, 206, 50, 0.10)"; // warm wash
// candlelight variants — the mist dims to embers rather than daylight
const FOG_CANDLE = "rgba(74, 58, 39, 0.90)";
const FOG_CANDLE_WASH = "rgba(232, 169, 60, 0.06)";
const REVEAL_RADIUS_M = 26;

/* ------------------------------------------------------------------ */
/* Overlay — fog canvas + DOM pins, portaled into .leaflet-container    */
/* ------------------------------------------------------------------ */

function Overlay() {
  const map = useMap();
  // read the container live — on a StrictMode remount the old node is
  // destroyed and a cached reference would portal into dead DOM
  return createPortal(<OverlayContent />, map.getContainer());
}

function OverlayContent() {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const [sparkles, setSparkles] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const sparkleSeq = useRef(0);
  const walkerRef = useRef<HTMLDivElement>(null);

  const walkedPath = useOtaStore((s) => s.walkedPath);
  const pos = useOtaStore((s) => s.userPosition);
  const pois = useOtaStore((s) => s.pois);
  const memories = useOtaStore((s) => s.memories);
  const patientState = useOtaStore((s) => s.patientState);
  const justCapturedId = useOtaStore((s) => s.justCapturedId);
  const simRunning = useOtaStore((s) => s.simRunning);
  const dogName = useOtaStore((s) => s.dogName);
  const motionSoft = useOtaStore((s) => s.comfortMotion === "soft");
  const candle = useOtaStore((s) => s.comfortTheme === "candle");
  const assignMissionTo = useOtaStore((s) => s.assignMissionTo);
  const activeMission = useOtaStore((s) => s.activeMission);
  const activeTier = STATE_TO_TIER[patientState];

  /** latlng → px, zoom-animation aware */
  const toPx = useCallback(
    (ll: LatLng) => {
      const m = map as unknown as {
        _latLngToNewLayerPoint?: (
          ll: L.LatLngExpression,
          z: number,
          c: L.LatLngExpression
        ) => L.Point;
        _zoomAnim?: { zoom: number; center: L.LatLng };
      };
      try {
        const za = m._zoomAnim;
        if (za && m._latLngToNewLayerPoint) {
          return m._latLngToNewLayerPoint(ll, za.zoom, za.center);
        }
        return map.latLngToContainerPoint(ll);
      } catch {
        // the map pane isn't laid out yet (first paint after client-side
        // navigation) — park everything offscreen; the next move event
        // repaints at real coordinates
        return { x: -9999, y: -9999 } as L.Point;
      }
    },
    [map]
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = map.getSize();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(size.x * dpr)) {
      canvas.width = Math.round(size.x * dpr);
      canvas.height = Math.round(size.y * dpr);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);

    if (useOtaStore.getState().comfortTheme === "candle") {
      ctx.fillStyle = FOG_CANDLE;
      ctx.fillRect(0, 0, size.x, size.y);
      ctx.fillStyle = FOG_CANDLE_WASH;
    } else {
      ctx.fillStyle = FOG_BUTTER;
      ctx.fillRect(0, 0, size.x, size.y);
      ctx.fillStyle = FOG_SOLAR;
    }
    ctx.fillRect(0, 0, size.x, size.y);

    const path = useOtaStore.getState().walkedPath;
    if (path.length === 0) return;

    let c, p1, p2;
    try {
      c = map.getCenter();
      p1 = map.latLngToContainerPoint(c);
      p2 = map.latLngToContainerPoint([c.lat, c.lng + 0.001]);
    } catch {
      return; // pane not laid out yet — next move event repaints
    }
    const mPerPx =
      map.distance(c, [c.lat, c.lng + 0.001]) / Math.max(1e-6, Math.abs(p2.x - p1.x));
    const rPx = Math.max(10, REVEAL_RADIUS_M / mPerPx);
    const stepPx = Math.max(6, rPx * 0.45);

    const stamp = (x: number, y: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, rPx);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.55, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rPx, 0, Math.PI * 2);
      ctx.fill();
    };

    ctx.globalCompositeOperation = "destination-out";
    let prev = toPx(path[0]);
    stamp(prev.x, prev.y);
    for (let i = 1; i < path.length; i++) {
      const pt = toPx(path[i]);
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / stepPx));
      for (let k = 1; k <= steps; k++) {
        stamp(prev.x + (dx * k) / steps, prev.y + (dy * k) / steps);
      }
      prev = pt;
    }
    ctx.globalCompositeOperation = "source-over";
  }, [map, toPx]);

  // repaint fog + re-flow pins on every map transform
  useEffect(() => {
    const onMove = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        redraw();
        tick();
      });
    };
    onMove();
    map.on("move zoom zoomanim resize moveend zoomend viewreset", onMove);
    return () => {
      map.off("move zoom zoomanim resize moveend zoomend viewreset", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [map, redraw]);

  // repaint whenever the trail grows + golden sparkles at the peel edge
  const lastSparkRef = useRef(0);
  useEffect(() => {
    redraw();
    tick();
    if (motionSoft || walkedPath.length < 2) return;
    const head = toPx(walkedPath[walkedPath.length - 1]);
    const now = performance.now();
    if (now - lastSparkRef.current < 120) return;
    lastSparkRef.current = now;
    const fresh = Array.from({ length: 3 }, (_, i) => ({
      id: ++sparkleSeq.current,
      x: head.x + Math.cos(i * 2.1 + now * 0.01) * (18 + i * 10),
      y: head.y + Math.sin(i * 2.1 + now * 0.01) * (14 + i * 8),
    }));
    setSparkles((s) => [...s.slice(-18), ...fresh]);
    const ids = fresh.map((f) => f.id);
    setTimeout(
      () => setSparkles((s) => s.filter((k) => !ids.includes(k.id))),
      1000
    );
  }, [walkedPath, redraw, toPx, motionSoft]);

  // candlelight swap repaints the mist
  useEffect(() => {
    redraw();
    tick();
  }, [candle, redraw]);

  // the dog walks while the player moves (GPS or sim) — settles to idle
  // ~2s after the last step, and jumps for joy when a capsule lands
  const [moving, setMoving] = useState(false);
  const [flip, setFlip] = useState(false); // art faces left — mirror for east
  const prevPtRef = useRef<{ x: number; y: number } | null>(null);
  const wPtNow = toPx(pos);
  useEffect(() => {
    const prev = prevPtRef.current;
    if (prev) {
      const dx = wPtNow.x - prev.x;
      if (Math.abs(dx) > 0.5) setFlip(dx > 0);
      if (Math.hypot(dx, wPtNow.y - prev.y) > 0.5) {
        setMoving(true);
        const t = setTimeout(() => setMoving(false), 2200);
        return () => clearTimeout(t);
      }
    }
    prevPtRef.current = wPtNow;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wPtNow.x, wPtNow.y]);

  const dogState: DogState = motionSoft
    ? "static"
    : justCapturedId
      ? "win"
      : simRunning || moving
        ? "walk"
        : "idle";

  /* suggested route — OSRM street-following path when the router
     answers, else the soft bezier suggestion */
  const missionPt =
    activeMission?.lat != null && activeMission?.lng != null
      ? toPx([activeMission.lat, activeMission.lng])
      : null;
  const showRoute =
    missionPt != null &&
    haversineM(pos, [activeMission!.lat!, activeMission!.lng!]) > 60;

  const [routeLL, setRouteLL] = useState<{ key: string; pts: LatLng[] } | null>(null);
  const routeAnchor = useRef<{ to: string; from: LatLng } | null>(null);
  useEffect(() => {
    if (!showRoute || !activeMission?.lat || !activeMission?.lng) return;
    const to: LatLng = [activeMission.lat, activeMission.lng];
    const key = `${activeMission.poiId}`;
    // re-route when the target changes or we've drifted >80m off origin
    if (
      routeAnchor.current?.to === key &&
      haversineM(routeAnchor.current.from, pos) < 80
    )
      return;
    routeAnchor.current = { to: key, from: pos };
    let dead = false;
    void fetchFootRoute(pos, to).then((r) => {
      if (!dead && r) setRouteLL({ key, pts: r.points });
    });
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRoute, activeMission?.poiId, pos[0], pos[1]]);

  const routePts =
    showRoute && routeLL && routeLL.key === activeMission?.poiId
      ? routeLL.pts
      : null;

  let routeD = "";
  if (showRoute && missionPt) {
    if (routePts && routePts.length > 1) {
      const pts = routePts.map((ll) => toPx(ll));
      routeD = pts
        .map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`)
        .join(" ");
    } else {
      const dx = missionPt.x - wPtNow.x;
      const dy = missionPt.y - wPtNow.y;
      const len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(42, len * 0.14);
      const cx = (wPtNow.x + missionPt.x) / 2 - (dy / len) * bend;
      const cy = (wPtNow.y + missionPt.y) / 2 + (dx / len) * bend;
      routeD = `M ${wPtNow.x} ${wPtNow.y - 16} Q ${cx} ${cy} ${missionPt.x} ${missionPt.y - 12}`;
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[650]"
        aria-hidden="true"
      />
      {/* peel-edge sparkles — golden motes where the mist just lifted */}
      <div className="pointer-events-none absolute inset-0 z-[675]">
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="sparkle"
            style={{ left: s.x, top: s.y }}
          />
        ))}
      </div>
      {/* memory capsules — blush droplets, tappable */}
      <div className="pointer-events-none absolute inset-0 z-[660]">
        {memories.map((m) => {
          const p = toPx([m.lat, m.lng]);
          const echo = isEcho(m);
          const landing = m.id === justCapturedId;
          return (
            <span key={m.id}>
              {landing && (
                <span
                  className="pin-ripple"
                  style={{ left: p.x - 16, top: p.y - 12, width: 32, height: 32 }}
                />
              )}
              <button
                type="button"
                title={echo ? `${m.poiName} — memory echo` : m.poiName}
                onClick={() =>
                  echo
                    ? useOtaStore.getState().openEcho(m.id)
                    : useOtaStore.getState().viewMemory(m.id)
                }
                className={`pointer-events-auto absolute h-[38px] w-[30px] cursor-pointer transition-transform active:scale-90 ${landing ? "pin-drop" : ""}`}
                style={{ transform: `translate(${p.x - 15}px, ${p.y - 35}px)` }}
                dangerouslySetInnerHTML={{ __html: memorySvgString(echo) }}
              />
            </span>
          );
        })}
      </div>
      {/* fireflies — anonymous "other explorers were here" glow at public POIs */}
      <div className="pointer-events-none absolute inset-0 z-[655]">
        {pois.map((poi) => {
          const p = toPx([poi.lat, poi.lng]);
          return fireflyDots(poi.id).map((d, i) => (
            <span
              key={`${poi.id}-f${i}`}
              className="firefly-dot absolute rounded-full"
              style={{
                left: p.x + d.dx - d.size / 2,
                top: p.y + d.dy - d.size / 2,
                width: d.size,
                height: d.size,
                opacity: d.opacity,
                animationDelay: `${d.delayS}s`,
              }}
            />
          ));
        })}
      </div>
      {/* POI beacons */}
      <div className="pointer-events-none absolute inset-0 z-[670]">
        {pois.map((poi) => {
          const kind = TIER_META[poi.tier].pin;
          const active = poi.tier === activeTier;
          const p = toPx([poi.lat, poi.lng]);
          const peers = fireflyCount(poi.id, poi.tier);
          return (
            <span key={poi.id}>
              <button
                type="button"
                title={`${poi.name} · ${peers} OtaPath explorer${peers === 1 ? "" : "s"} visited today`}
                onClick={() => assignMissionTo(poi)}
                className="pointer-events-auto absolute h-[60px] w-[52px] cursor-pointer transition-transform duration-200 active:scale-90"
                style={{ transform: `translate(${p.x - 26}px, ${p.y - 56}px)` }}
                dangerouslySetInnerHTML={{ __html: pinSvgString(kind, active) }}
              />
              {active && (
                <span
                  className="pointer-events-none absolute whitespace-nowrap rounded-full bg-cream/95 px-2 py-0.5 font-sans text-[9px] font-bold text-ink-charcoal/60 shadow-[0_1px_0_0_rgba(28,25,23,0.12)]"
                  style={{
                    transform: `translate(${Math.min(
                      Math.max(4, p.x - 34),
                      map.getSize().x - 96
                    )}px, ${p.y + 4}px)`,
                  }}
                >
                  {peers} explorer{peers === 1 ? "" : "s"} today
                </span>
              )}
            </span>
          );
        })}
      </div>
      {/* suggested route to the active quest — gentle dotted path above the mist */}
      {showRoute && missionPt && (
        <svg
          className="pointer-events-none absolute inset-0 z-[662] h-full w-full"
          aria-hidden="true"
        >
          <path
            d={routeD}
            fill="none"
            className="ota-route"
            stroke="#FDF8EE"
            strokeWidth={7}
            opacity={0.8}
          />
          <path
            d={routeD}
            fill="none"
            className="ota-route ota-route-march"
            stroke="#FF6B2B"
            strokeWidth={3.5}
            strokeDasharray="0.5 11"
          />
          <circle
            cx={missionPt.x}
            cy={missionPt.y - 12}
            r={4.5}
            fill="#FF6B2B"
            stroke="#FDF8EE"
            strokeWidth={2.5}
          />
        </svg>
      )}
      {/* clinician-prescribed mission pin — a special glowing beacon */}
      {activeMission?.assignedBy === "CLINICIAN_CUSTOM" &&
        activeMission.lat != null &&
        activeMission.lng != null &&
        (() => {
          const p = toPx([activeMission.lat, activeMission.lng]);
          const kind = TIER_META[activeMission.tier].pin;
          return (
            <div className="pointer-events-none absolute inset-0 z-[675]">
              <span
                className="absolute h-[60px] w-[52px]"
                style={{ transform: `translate(${p.x - 26}px, ${p.y - 56}px)` }}
                dangerouslySetInnerHTML={{ __html: pinSvgString(kind, true) }}
              />
              <span
                className="absolute whitespace-nowrap rounded-full bg-blush px-2 py-0.5 font-sans text-[9px] font-extrabold uppercase tracking-wide text-cream shadow-[0_1px_0_0_rgba(28,25,23,0.15)]"
                style={{
                  transform: `translate(${Math.min(
                    Math.max(4, p.x - 44),
                    map.getSize().x - 110
                  )}px, ${p.y + 4}px)`,
                }}
              >
                {activeMission.doctorName ?? "your doctor"}
              </span>
            </div>
          );
        })()}
      {/* the dog — he walks the map beside you, name tag and all */}
      <div
        ref={walkerRef}
        className="ota-dom-walker pointer-events-none absolute z-[680] flex flex-col items-center"
        style={{
          transform: `translate(${wPtNow.x - 46}px, ${wPtNow.y - (dogName ? 106 : 84)}px)`,
        }}
      >
        {dogName && (
          <span className="mb-1 whitespace-nowrap rounded-full bg-cream/95 px-2.5 py-0.5 font-sans text-[10px] font-extrabold text-ink-charcoal/75 shadow-[0_1px_0_0_rgba(28,25,23,0.15)]">
            {dogName}
          </span>
        )}
        <OtaDog state={dogState} flip={flip} size={92} />
      </div>
      {/* locate + recenter — re-acquires a real GPS fix, then flies home */}
      <button
        type="button"
        aria-label="Use my current GPS location"
        onClick={() => {
          useOtaStore.getState().locateNow();
          map.flyTo(pos, Math.max(map.getZoom(), 17), { duration: 0.8 });
        }}
        className="card-tactile pointer-events-auto absolute right-3 top-[96px] z-[700] flex h-11 w-11 items-center justify-center rounded-full bg-cream transition-transform active:scale-95"
      >
        <LocateFixed className="h-5 w-5 text-ink-charcoal" strokeWidth={2.5} />
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* GpsWatcher + WorldSync                                             */
/* ------------------------------------------------------------------ */

function GpsWatcher() {
  const map = useMap();
  const firstFix = useRef(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const ll: LatLng = [p.coords.latitude, p.coords.longitude];
        const st = useOtaStore.getState();
        st.setGpsActive(true);
        if (!firstFix.current) {
          firstFix.current = true;
          // first real fix re-anchors the whole world to the user
          st.relocateTo(ll, "gps");
          map.flyTo(ll, 17, { duration: 1.4 });
          return;
        }
        st.setUserPosition(ll);
        st.appendWalkPoint(ll);
      },
      () => useOtaStore.getState().setGpsActive(false),
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [map]);

  return null;
}

/** flies the map home whenever the store bumps recenterTick */
function RecenterWatcher() {
  const map = useMap();
  const tick = useOtaStore((s) => s.recenterTick);
  const pos = useOtaStore((s) => s.userPosition);
  const seen = useRef(tick);
  useEffect(() => {
    if (tick === seen.current) return;
    seen.current = tick;
    map.flyTo(pos, 17, { duration: 1.2 });
  }, [tick, pos, map]);
  return null;
}

function WorldSync() {
  const map = useMap();
  const pos = useOtaStore((s) => s.userPosition);
  const simRunning = useOtaStore((s) => s.simRunning);
  const fetchAnchor = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!fetchAnchor.current || haversineM(fetchAnchor.current, pos) > 800) {
      fetchAnchor.current = pos;
      useOtaStore.getState().loadPois(true);
    }
  }, [pos]);

  useEffect(() => {
    if (simRunning && !map.getBounds().pad(-0.18).contains(pos)) {
      map.panTo(pos, { animate: true });
    }
  }, [pos, simRunning, map]);

  return null;
}

/* ------------------------------------------------------------------ */

export default function ExploreMap() {
  const simRunning = useOtaStore((s) => s.simRunning);
  const divRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const leafletCtx = useMemo(() => (map ? createLeafletContext(map) : null), [map]);

  // Imperative map lifecycle — MapContainer's JSX remount races React 19
  // StrictMode/fast navigation and leaves a stale _leaflet_id on the node
  // ("Map container is being reused", getPane() crashes). Creating and
  // removing the map ourselves guarantees the panes always exist before
  // any layer mounts, and the node is truly clean on unmount.
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const m = L.map(el, {
      center: DEFAULT_CENTER,
      zoom: 17,
      zoomControl: false,
      maxZoom: 19,
      minZoom: 12,
    });
    setMap(m);
    return () => {
      setMap(null);
      m.remove();
    };
  }, []);

  return (
    <div className={`absolute inset-0 ${simRunning ? "sim-running" : ""}`}>
      <div ref={divRef} className="h-full w-full" />
      {leafletCtx && (
        <LeafletContext.Provider value={leafletCtx}>
          {/* OSM Standard tiles — no key required. Swap `url` for a
              Mapbox style + token in production if desired. */}
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          />
          <GpsWatcher />
          <RecenterWatcher />
          <WorldSync />
          <Overlay />
        </LeafletContext.Provider>
      )}
    </div>
  );
}
