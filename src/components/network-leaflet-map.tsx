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

// Leaflet map center panning helper component (safe deferred execution to prevent HMR/mounting lifecycle crashes)
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
      <div className="w-full h-[500px] bg-muted/10 flex items-center justify-center border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground font-mono">Mounting Map layers...</p>
      </div>
    );
  }

  // Detect active case based on ingested documents
  const isReacherCase = documents.some((d: any) => 
    d.raw_text?.toLowerCase().includes("reacher") || 
    d.raw_text?.toLowerCase().includes("kliner")
  );

  // Set default center coordinates and pings based on active case
  let center: [number, number] = [28.6304, 77.2177]; // Delhi Default
  let zoom = 11;
  let towers: TowerPing[] = [];

  if (isReacherCase) {
    center = [33.7490, -84.3880]; // Margrave, Georgia
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
        details: "Paul Hubble residence tower. Multiple calls intercepted coordinating transport delivery schedules of counterfeit shipments.",
        timeLabel: "13th Oct 2026, 14:30"
      },
      {
        id: "TOWER-MARG-03",
        name: "Kliner Foundation Estate - Warehouse Antenna",
        lat: 33.7380,
        lng: -84.3980,
        eventsCount: 45,
        details: "KJ Kliner warehouse perimeter. Sighting location of black Bentley (GA-04-XX-4444) and coordinating burner calls.",
        timeLabel: "14th Oct 2026, 03:45"
      }
    ];
  } else {
    // Delhi / India Cartel Default
    center = [28.6304, 77.2177];
    zoom = 6; // zoom out to show both Lucknow & Delhi
    towers = [
      {
        id: "TOWER-DEL-CONN-01",
        name: "Delhi Connaught Place - Core Antenna 01",
        lat: 28.6304,
        lng: 77.2177,
        eventsCount: 42,
        details: "Delhi Cartel Cell A primary tower. Sanjay Dutt burner and Devendra Maurya pings active.",
        timeLabel: "10th Apr 2026, 11:20"
      },
      {
        id: "TOWER-DEL-CONN-03",
        name: "Delhi Connaught Place - Outer Grid 03",
        lat: 28.6289,
        lng: 77.2215,
        eventsCount: 18,
        details: "Geographic co-location overlap pings logged for Jagtap and Maurya.",
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
        name: "Delhi West - Dwarka Grid 11",
        lat: 28.6143,
        lng: 77.1258,
        eventsCount: 9,
        details: "Atypical hours (02:30 AM) cellular call pings recorded.",
        timeLabel: "13th Apr 2026, 02:30"
      }
    ];
  }

  // Custom DivIcon to prevent missing Leaflet asset bugs
  const createCustomIcon = (color: string) => {
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>`,
      className: "custom-leaflet-marker",
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  };

  return (
    <div className="w-full h-full min-h-[500px] rounded-lg border overflow-hidden relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "#0b0f19" }}
      >
        <ChangeMapView center={center} zoom={zoom} />
        
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        />

        {towers.map((tower) => (
          <React.Fragment key={tower.id}>
            {/* Draw tower range radius circle */}
            <Circle
              center={[tower.lat, tower.lng]}
              radius={isReacherCase ? 500 : 2000} // Smaller radius for local Margrave town
              pathOptions={{
                color: tower.id.includes("CONN") || tower.id.includes("MARG-01") ? "#ef4444" : "#3b82f6",
                fillColor: tower.id.includes("CONN") || tower.id.includes("MARG-01") ? "#ef4444" : "#3b82f6",
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: "3, 6"
              }}
            />

            {/* Plot Tower Marker */}
            <Marker
              position={[tower.lat, tower.lng]}
              icon={createCustomIcon(tower.id.includes("CONN") || tower.id.includes("MARG-01") ? "#ef4444" : "#3b82f6")}
            >
              {/* Permanent place name tooltip overlay */}
              <Tooltip 
                permanent 
                direction="top" 
                offset={[0, -10]} 
                className="!bg-slate-950/90 !text-slate-100 !border-blue-500/30 text-[10px] font-mono font-bold rounded px-2 py-1 shadow-lg select-none"
              >
                {tower.name.split(" - ")[0]}
              </Tooltip>
              <Popup>
                <div className="p-2 space-y-1.5 text-xs text-slate-800 select-none">
                  <div className="font-extrabold text-slate-900 border-b pb-1">
                    {tower.name}
                  </div>
                  <div className="font-mono text-[9px] text-slate-500">
                    ID: {tower.id} | Lat/Lng: {tower.lat.toFixed(4)}, {tower.lng.toFixed(4)}
                  </div>
                  <div className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold inline-block">
                     📅 Time: {tower.timeLabel}
                  </div>
                  <p className="text-slate-600 leading-relaxed font-sans mt-1">
                    {tower.details}
                  </p>
                  <div className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold text-[9px]">
                    {tower.eventsCount} Cellular Logs
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
