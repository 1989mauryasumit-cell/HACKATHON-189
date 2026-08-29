"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapPin, Info, ShieldAlert, Loader2, Calendar } from "lucide-react";
import { DatabaseClient } from "@/lib/supabase";
import dynamic from "next/dynamic";

// Dynamic import with SSR disabled to prevent server-side Leaflet build issues
const NetworkLeafletMap = dynamic(
  () => import("@/components/network-leaflet-map"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[550px] bg-slate-950/20 border rounded-lg flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2 font-mono">Initializing Leaflet map layers...</p>
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
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Title */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MapPin className="h-6 w-6 text-blue-500" />
          <span>Geographic Cell-Tower Map</span>
        </h1>
        <p className="text-muted-foreground text-xs">
          Plot cellular tower pings, estimate geographical range circles, and analyze suspect co-location logs.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Map Centerpiece canvas */}
        <div className="lg:col-span-3 min-h-0 flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm relative">
          {loading ? (
            <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-slate-950/10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <NetworkLeafletMap documents={documents} />
          )}
        </div>

        {/* Sidebar logs details */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin shrink-0 select-none">
          <Card className="border-blue-500/20 bg-muted/5">
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
                <span>Geographic Co-location Logs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {isReacherCase ? (
                // Reacher Case Logs
                <>
                  <div className="p-3 border rounded-lg bg-card/80 space-y-2 border-red-500/20 bg-red-500/5">
                    <div className="font-bold text-red-400 flex items-center justify-between">
                      <span>Underpass Overlap Spike</span>
                      <span className="text-[9px] bg-red-500/20 text-red-300 px-1 rounded flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" /> 12 Oct
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Burner phone <strong>+91 92203 44502</strong> registered on TOWER-MARG-01 within the murder timeline of Joe Reacher, placing it directly at the crime scene.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg bg-card/80 space-y-2">
                    <div className="font-bold text-foreground flex items-center justify-between">
                      <span>Kliner Warehouse Sighting</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" /> 14 Oct
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Surveillance logs trace Kliner's custom Bentley <strong>GA-04-XX-4444</strong> active within range circle of TOWER-MARG-03 during late night hours.
                    </p>
                  </div>
                </>
              ) : (
                // Delhi default Cartel logs
                <>
                  <div className="p-3 border rounded-lg bg-card/80 space-y-2 border-red-500/20 bg-red-500/5">
                    <div className="font-bold text-red-400 flex items-center justify-between">
                      <span>CONN-01 Co-location Spike</span>
                      <span className="text-[9px] bg-red-500/20 text-red-300 px-1 rounded flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" /> 10 Apr
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Devendra Maurya and Vikram Jagtap registered on tower TOWER-DEL-CONN-01 within 2 minutes of each other, suggesting a physical handoff.
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg bg-card/80 space-y-2">
                    <div className="font-bold text-foreground flex items-center justify-between">
                      <span>LKO-02 Hazratganj Activity</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" /> 12 Apr
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      UP Cartel members (Sandeep Yadav, Prem Chopra) active on Lucknow tower Hazratganj, exchanging 31 pings during late-night hours.
                    </p>
                  </div>
                </>
              )}

              <div className="p-3 border border-dashed rounded-lg bg-card/20 flex gap-2">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Click on any marker on the map to inspect coordinates, ranges, timeline dates, and tower log details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
