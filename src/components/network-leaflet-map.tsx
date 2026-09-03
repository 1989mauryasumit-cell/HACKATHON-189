"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface TowerPing {
  id: string;
  name: string;
  lat: number;
  lng: number;
  eventsCount: number;
  details: string;
  timeLabel: string;
}

// Leaflet map center panning helper component
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      try {
        map.setView(center, zoom);
      } catch (err) {
        console.warn("Deferred Leaflet setView handled safely:", err);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [center, zoom, map]);
  return null;
}

export default function NetworkLeafletMap({ documents = [] }: { documents: any[] }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[540px] bg-slate-950/80 flex items-center justify-center border border-slate-800 rounded-xl">
        <p className="text-xs text-sky-400 font-mono animate-pulse">Mounting Geo-Spatial Radar layers...</p>
      </div>
    );
  }

  // Detect active case
  const isReacherCase = documents.some((d: any) => 
    d.raw_text?.toLowerCase().includes("reacher") || 
    d.raw_text?.toLowerCase().includes("kliner")
  );

  let center: [number, number] = [28.6304, 77.2177];
  let zoom = 7;
  let towers: TowerPing[] = [];

  if (isReacherCase) {
    center = [33.7490, -84.3880];
    zoom = 13;
    towers = [
      {
        id: "TOWER-MARG-01",
        name: "Margrave Underpass - Cell Tower 01",
        lat: 33.7490,
        lng: -84.3880,
        eventsCount: 14,
        details: "Homicide Scene. Burner +91 92203 44502 active at 10:14 PM near Joe Reacher's body placement site.",
        timeLabel: "12th Oct 2026, 22:14"
      },
      {
        id: "TOWER-MARG-02",
        name: "Margrave Bank & Trust - Core Grid",
        lat: 33.7540,
        lng: -84.3800,
        eventsCount: 22,
        details: "Paul Hubble residence tower. Intercepted calls coordinating counterfeit shipments.",
        timeLabel: "13th Oct 2026, 14:30"
      },
      {
        id: "TOWER-MARG-03",
        name: "Kliner Foundation Estate - Warehouse",
        lat: 33.7380,
        lng: -84.3980,
        eventsCount: 45,
        details: "KJ Kliner warehouse perimeter. Sighting location of black Bentley (GA-04-XX-4444).",
        timeLabel: "14th Oct 2026, 03:45"
      }
    ];
  } else {
    // Delhi & UP Cartel Network
    center = [27.7, 78.8];
    zoom = 7;
    towers = [
      {
        id: "TOWER-DEL-CONN-01",
        name: "Delhi Connaught Place - Core Antenna 01",
        lat: 28.6304,
        lng: 77.2177,
        eventsCount: 42,
        details: "Delhi Cartel Cell A primary hub. Devendra Maurya and Sanjay Dutt burner SIM pings active.",
        timeLabel: "10th Apr 2026, 11:20"
      },
      {
        id: "TOWER-DEL-CONN-03",
        name: "Delhi Connaught Place - Outer Grid 03",
        lat: 28.6289,
        lng: 77.2215,
        eventsCount: 18,
        details: "Geographic co-location overlap pings logged for Vikram Jagtap and Devendra Maurya.",
        timeLabel: "10th Apr 2026, 11:22"
      },
      {
        id: "TOWER-DEL-OUTER-09",
        name: "Delhi Outer Ring Road - Sector 9",
        lat: 28.7041,
        lng: 77.1025,
        eventsCount: 15,
        details: "Arjun Sen broker call bridge connection pings recorded.",
        timeLabel: "11th Apr 2026, 16:45"
      },
      {
        id: "TOWER-UP-LKO-02",
        name: "Lucknow Hazratganj - Central Grid 02",
        lat: 26.8467,
        lng: 80.9462,
        eventsCount: 31,
        details: "UP Cartel Cell B primary tower. Sandeep Yadav and Prem Chopra pings active.",
        timeLabel: "12th Apr 2026, 23:10"
      },
      {
        id: "TOWER-DEL-WEST-11",
        name: "Delhi West - Dwarka Sector 11",
        lat: 28.6143,
        lng: 77.1258,
        eventsCount: 9,
        details: "Atypical late-night (02:30 AM) cellular call pings recorded.",
        timeLabel: "13th Apr 2026, 02:30"
      }
    ];
  }

  const createTowerIcon = (color: string) => {
    return L.divIcon({
      className: "custom-tower-marker",
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 0 10px ${color};"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });
  };

  return (
    <div className="w-full h-full min-h-[540px] relative rounded-xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[540px] z-0"
        style={{ background: "#050811" }}
      >
        <ChangeMapView center={center} zoom={zoom} />
        
        {/* Dark Matter Cyber Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a> &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {towers.map((tower, idx) => {
          const isHighAlert = tower.eventsCount > 30;
          const color = isHighAlert ? "#f43f5e" : idx % 2 === 0 ? "#0284c7" : "#059669";
          const radiusMeters = 3500 + tower.eventsCount * 60;

          return (
            <React.Fragment key={tower.id}>
              {/* Coverage Range Ring */}
              <Circle
                center={[tower.lat, tower.lng]}
                radius={radiusMeters}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: "4, 4"
                }}
              />

              {/* Marker Pin */}
              <Marker
                position={[tower.lat, tower.lng]}
                icon={createTowerIcon(color)}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <span className="font-mono text-xs font-bold">{tower.name}</span>
                </Tooltip>

                <Popup className="cyber-leaflet-popup">
                  <div className="p-1 space-y-1.5 font-sans" style={{ minWidth: "220px", color: "#0f172a" }}>
                    <div className="flex items-center justify-between border-b pb-1">
                      <strong className="text-xs text-sky-900">{tower.id}</strong>
                      <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-bold font-mono">
                        {tower.eventsCount} PINGS
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{tower.name}</p>
                    <p className="text-[11px] text-slate-600 leading-tight">{tower.details}</p>
                    <div className="text-[10px] font-mono text-slate-500 pt-1 border-t">
                      ⏰ {tower.timeLabel}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
