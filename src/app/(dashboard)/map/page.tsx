"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Info, ShieldAlert, Loader2, Calendar, Radio, Users, Network, Compass, ArrowRight } from "lucide-react";
import { DatabaseClient } from "@/lib/supabase";
import dynamic from "next/dynamic";

const NetworkLeafletMap = dynamic(
  () => import("@/components/network-leaflet-map"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[550px] bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <p className="text-xs text-slate-400 mt-2 font-mono">Initializing Leaflet Geo-Spatial Layers...</p>
      </div>
    )
  }
);

export default function MapPage() {
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadDocs = async () => {
      try {
        const docs = await DatabaseClient.getDocuments();
        setDocuments(docs || []);
      } catch (err) {
        console.error("Failed to load documents for map", err);
      } finally {
        setLoading(false);
      }
    };
    loadDocs();
  }, []);

  const isReacherCase = documents.some((d: any) => 
    d.raw_text?.toLowerCase().includes("reacher") || 
    d.raw_text?.toLowerCase().includes("kliner")
  );

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-120px)]">
      {/* TITLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <MapPin className="h-6 w-6 text-sky-400" />
              <span>Geo-Spatial Cell Tower Triangulation</span>
            </h1>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
              DELHI & UP SECTOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Plot cellular tower pings, estimate geographical range circles, and analyze suspect co-location overlaps.
          </p>
        </div>

        <Link href="/timeline">
          <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 border-slate-700">
            <Compass className="h-3.5 w-3.5 text-sky-400" />
            View CDR Action Timeline
          </Button>
        </Link>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* LEAFLET MAP CANVAS (8 Cols) */}
        <div className="lg:col-span-8 min-h-0 flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl relative">
          {loading ? (
            <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-slate-950">
              <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            </div>
          ) : (
            <NetworkLeafletMap documents={documents} />
          )}
        </div>

        {/* SIDEBAR LOGS & CO-LOCATION DETECTIONS (4 Cols) */}
        <div className="lg:col-span-4 space-y-3 overflow-y-auto pr-1">
          <Card className="border-slate-800 bg-slate-900/90">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span>Geographic Co-location Traces</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-3 text-xs">
              {isReacherCase ? (
                <>
                  <div className="p-3 border rounded-xl bg-rose-950/20 border-rose-500/30 space-y-1.5">
                    <div className="font-bold text-rose-300 flex items-center justify-between text-xs">
                      <span>Underpass Overlap Spike</span>
                      <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                        12 Oct, 22:14
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Burner phone <strong className="text-slate-200 font-mono">+91 92203 44502</strong> registered on TOWER-MARG-01 within murder timeline.
                    </p>
                  </div>

                  <div className="p-3 border rounded-xl bg-slate-950/60 border-slate-800 space-y-1.5">
                    <div className="font-bold text-slate-200 flex items-center justify-between text-xs">
                      <span>Kliner Warehouse Sighting</span>
                      <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded border border-sky-500/30">
                        14 Oct, 03:45
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Surveillance traces Bentley <strong className="text-slate-200 font-mono">GA-04-XX-4444</strong> active within range circle of TOWER-MARG-03.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 border rounded-xl bg-rose-950/20 border-rose-500/30 space-y-1.5">
                    <div className="font-bold text-rose-300 flex items-center justify-between text-xs">
                      <span>CONN-01 Co-location Spike</span>
                      <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                        10 Apr, 11:22
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Devendra Maurya and Vikram Jagtap registered on tower <strong className="text-slate-200 font-mono">TOWER-DEL-CONN-01</strong> within 2 minutes of each other.
                    </p>
                  </div>

                  <div className="p-3 border rounded-xl bg-slate-950/60 border-slate-800 space-y-1.5">
                    <div className="font-bold text-slate-200 flex items-center justify-between text-xs">
                      <span>LKO-02 Hazratganj Activity</span>
                      <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded border border-sky-500/30">
                        12 Apr, 23:10
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      UP Cartel members (Sandeep Yadav, Prem Chopra) active on Lucknow tower Hazratganj, exchanging 31 pings during late-night hours.
                    </p>
                  </div>
                </>
              )}

              <div className="p-3 border border-sky-500/20 rounded-xl bg-sky-950/20 flex gap-2">
                <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Click on any glowing radar marker on the map to inspect coordinates, estimated range radiuses, and cell logs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
