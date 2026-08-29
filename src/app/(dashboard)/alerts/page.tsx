"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Settings2,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  FileText,
  UserCheck,
  Shield,
  Loader2,
  Eye,
  Sliders,
  Check
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import { logAuditEvent } from "@/lib/auth";
import Link from "next/link";

interface Alert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  entity_ids: string[];
  evidence: string[];
  confidence: number;
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  detected_at: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [entities, setEntities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedAlert, setSelectedAlert] = React.useState<Alert | null>(null);

  // Settings thresholds
  const [panLimit, setPanLimit] = React.useState(50000);
  const [burnerLifespan, setBurnerLifespan] = React.useState(5);
  const [spikeVolume, setSpikeVolume] = React.useState(35);
  const [dormancyPeriod, setDormancyPeriod] = React.useState(90);
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);

  // Load alerts and entities
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const altData = await DatabaseClient.getAlerts();
      const entData = await DatabaseClient.getEntities();
      setAlerts(altData);
      setEntities(entData);
      
      // Select first alert by default
      if (altData.length > 0 && !selectedAlert) {
        setSelectedAlert(altData[0]);
      }
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAlert]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Update alert status
  const handleUpdateStatus = async (alertId: string, newStatus: any) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        const target = db.alerts.find(a => a.id === alertId);
        if (target) {
          target.status = newStatus;
          MockDatabase.save(db);
        }
      } else {
        const { supabase } = require("@/lib/supabase");
        await supabase
          .from("alerts")
          .update({ status: newStatus })
          .eq("id", alertId);
      }

      // Log to audit log
      await logAuditEvent(
        "update_alert_status",
        "alerts",
        alertId,
        { previousStatus: selectedAlert?.status, newStatus }
      );

      // Refresh local state
      await loadData();
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    // Simulate savings settings triggers
    await new Promise(r => setTimeout(r, 1000));
    setIsSavingSettings(false);
    alert("System alerts detection thresholds updated successfully!");
    
    await logAuditEvent("update_alert_thresholds", "system_settings", undefined, {
      panLimit,
      burnerLifespan,
      spikeVolume,
      dormancyPeriod
    });
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'investigating': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'dismissed': return 'bg-muted text-muted-foreground border border-border';
      default: return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suspicious Pattern Alerts</h1>
        <p className="text-muted-foreground">
          View triggered money laundering and cellular coordinate warnings, customize algorithms, and manage case queues.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Threshold settings & alert list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Threshold settings */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-500" />
                <span>Detection Thresholds Settings</span>
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveSettings}>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>Structuring Cash Limit</span>
                    <span>₹{panLimit.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="100000"
                    step="5000"
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    value={panLimit}
                    onChange={(e) => setPanLimit(Number(e.target.value))}
                  />
                </div>
                {/* 2 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>Burner SIM Lifespan</span>
                    <span>{burnerLifespan} Days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    value={burnerLifespan}
                    onChange={(e) => setBurnerLifespan(Number(e.target.value))}
                  />
                </div>
                {/* 3 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>Call Spike Threshold</span>
                    <span>{spikeVolume} Calls/Day</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    value={spikeVolume}
                    onChange={(e) => setSpikeVolume(Number(e.target.value))}
                  />
                </div>
                {/* 4 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>SIM Dormancy Window</span>
                    <span>{dormancyPeriod} Days</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="10"
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    value={dormancyPeriod}
                    onChange={(e) => setDormancyPeriod(Number(e.target.value))}
                  />
                </div>
              </CardContent>
              <CardFooter className="py-3 border-t bg-muted/10 flex justify-end">
                <Button type="submit" size="sm" className="h-7 text-xs" disabled={isSavingSettings}>
                  {isSavingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Save Thresholds
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Active alerts queue */}
          <Card>
            <CardHeader>
              <CardTitle>Active Incident Queue ({alerts.length})</CardTitle>
              <CardDescription>
                System-wide alerts triggered from hybrid regex extraction and network centrality changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((al) => (
                    <div
                      key={al.id}
                      onClick={() => setSelectedAlert(al)}
                      className={`p-4 border rounded-lg hover:bg-muted/15 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        selectedAlert?.id === al.id ? "border-primary bg-primary/5" : "bg-card"
                      }`}
                    >
                      <div className="space-y-1.5 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${getSeverityBadgeColor(al.severity)}`}>
                            {al.severity}
                          </span>
                          <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${getStatusBadgeColor(al.status)}`}>
                            {al.status}
                          </span>
                          <p className="font-semibold text-sm truncate">{al.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate w-80 md:w-96">
                          {(al.explanation || al.description || '')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(al.detected_at || al.created_at || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Explain this alert panel */}
        <div className="lg:col-span-1">
          {selectedAlert ? (
            <Card className="sticky top-6 border-blue-500/20 bg-muted/5">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  <span>Explain This Alert</span>
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  ID: {selectedAlert.id} • Confidence: {(selectedAlert.confidence * 100).toFixed(0)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-xs select-none">
                {/* Visual warning */}
                <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-red-400">Suspicious Activity Detected</h4>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {(selectedAlert.explanation || selectedAlert.description || '') || selectedAlert.description}
                    </p>
                  </div>
                </div>

                {/* Workflow state selector */}
                <div className="space-y-2 border-t pt-4">
                  <label className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider block">
                    Workflow Status
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedAlert.status}
                      onChange={(e) => handleUpdateStatus(selectedAlert.id, e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="new" className="text-black bg-white">New Alert</option>
                      <option value="investigating" className="text-black bg-white">Investigating / Open Case</option>
                      <option value="resolved" className="text-black bg-white">Resolved / Closed</option>
                      <option value="dismissed" className="text-black bg-white">Dismissed / False Alarm</option>
                    </select>
                  </div>
                </div>

                {/* Linked Suspects */}
                {selectedAlert.entity_ids && selectedAlert.entity_ids.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                      <span>Linked suspect entities</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedAlert.entity_ids.map(id => {
                        const ent = entities.find(e => e.id === id);
                        if (!ent) return null;
                        return (
                          <div key={id} className="p-2 border rounded bg-card flex justify-between items-center hover:bg-muted/10 transition-all">
                            <div>
                              <span className="font-semibold">{ent.canonical_name}</span>
                              <span className="text-[10px] text-muted-foreground ml-2 uppercase">({ent.entity_type})</span>
                            </div>
                            <Link href={`/entity/${ent.id}`} className="text-blue-400 hover:underline hover:text-blue-300 font-semibold text-[11px]">
                              View profile
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Evidence files */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-purple-400" />
                    <span>Evidence files & Case Logs</span>
                  </h4>
                  <div className="p-3 border rounded bg-card flex flex-col gap-1 text-[11px] font-mono leading-relaxed text-muted-foreground">
                    <div>• Case file: FIR-2026-DEL-092</div>
                    <div>• CDR records duration overlap: 2026-05-10</div>
                    <div>• Bank ledger audit: HDFC transactions list</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="sticky top-6 border-dashed flex flex-col items-center justify-center p-8 text-center h-[50vh] text-xs">
              <Shield className="h-6 w-6 text-blue-500/40 mb-2 animate-pulse" />
              <CardTitle className="text-xs font-semibold">Active Alert detail</CardTitle>
              <CardDescription className="max-w-[160px] mt-1">
                Select an alert from the active queue to view explanation, change investigator status, and see links.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
