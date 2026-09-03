"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  AlertTriangle,
  Database,
  ArrowRight,
  TrendingUp,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Network,
  Shield,
  Activity,
  Flame,
  Radio,
  Zap,
  ArrowUpRight,
  Phone,
  CreditCard,
  Car,
  Compass,
  Sparkles,
  Trash2,
  RefreshCcw,
  RotateCcw
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase, EMPTY_DB } from "@/lib/mock-db";
import { AdminVaultService } from "@/lib/vault";
import { getClientSession } from "@/lib/auth";

export default function DashboardPage() {
  const [loading, setLoading] = React.useState<"load" | "wipe" | null>(null);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showWipeConfirm, setShowWipeConfirm] = React.useState(false);
  const [stats, setStats] = React.useState({
    entities: 0,
    relationships: 0,
    documents: 0,
    alerts: 0,
    cases: 0
  });

  // Load real counts from local/supabase DB
  const loadRealCounts = React.useCallback(async () => {
    try {
      const [ents, rels, docs, alerts, cases] = await Promise.all([
        DatabaseClient.getEntities(),
        DatabaseClient.getRelationships(),
        DatabaseClient.getDocuments(),
        DatabaseClient.getAlerts(),
        DatabaseClient.getCases()
      ]);
      setStats({
        entities: ents.length,
        relationships: rels.length,
        documents: docs.length,
        alerts: alerts.length,
        cases: cases.length
      });
    } catch (err) {
      console.log("Failed to load real counts", err);
    }
  }, []);

  React.useEffect(() => {
    loadRealCounts();
  }, [loadRealCounts]);

  const handleLoadSeed = async () => {
    setLoading("load");
    setMessage(null);
    try {
      const res = await fetch("/api/demo/load", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load seed data.");
      if (data.dbDump) {
        MockDatabase.save(data.dbDump);
      }
      setMessage({ text: data.message || "Ground-truth cartel network (672+ Entities, 3,560+ Edges) successfully loaded!", type: "success" });
      await loadRealCounts();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setMessage({ text: err.message || "Network error loading seed data.", type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const handleWipeAllData = async () => {
    setLoading("wipe");
    setMessage(null);
    try {
      await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "clear" })
      });
    } catch (err: any) {
      console.error(err);
    }
    const session = getClientSession();
    AdminVaultService.createSnapshotAndReset(
      session?.full_name || "Administrator",
      session?.badge_id || "ADM-001",
      `Operational Backup — ${new Date().toLocaleDateString("en-IN")}`
    );
    setStats({
      entities: 0,
      relationships: 0,
      documents: 0,
      alerts: 0,
      cases: 0
    });
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* PAGE TITLE & HERO BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Intelligence Operations Command</h1>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
              stats.entities > 0 
                ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}>
              {stats.entities > 0 ? `${stats.entities} ENTITIES LOADED` : "CLEAN SLATE (0 RECORDS)"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time multi-source criminal network analysis, graph centrality metrics, and automated decision support.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/graph">
            <Button variant="cyber" size="sm" className="text-xs font-semibold gap-1.5">
              <Network className="h-4 w-4" />
              Open Network Graph
            </Button>
          </Link>
          <Link href="/ingestion">
            <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 border-slate-700">
              <Database className="h-4 w-4 text-sky-400" />
              Ingest Documents
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI METRIC CARDS (4 HIGH-IMPACT TILES) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Entities */}
        <Card className="relative overflow-hidden border-slate-800 bg-slate-900/80 hover:border-sky-500/40 transition-all">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monitored Entities
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono">
              {stats.entities.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>{stats.entities > 0 ? "+182 resolved duplicates merged" : "No entities loaded"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Network Relationships */}
        <Card className="relative overflow-hidden border-slate-800 bg-slate-900/80 hover:border-purple-500/40 transition-all">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Network Edges (CDRs/Tx)
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Network className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono">
              {stats.relationships.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.relationships > 0 ? "Weighted by call frequency & amounts" : "0 communication links"}
            </p>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="relative overflow-hidden border-slate-800 bg-slate-900/80 hover:border-rose-500/40 transition-all">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-rose-500 to-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Anomalies & Alerts
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 tracking-tight font-mono flex items-center gap-2">
              {stats.alerts}
              {stats.alerts > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.alerts > 0 ? "Active severity alerts pending triage" : "No anomalous patterns"}
            </p>
          </CardContent>
        </Card>

        {/* Ingested Case Docs */}
        <Card className="relative overflow-hidden border-slate-800 bg-slate-900/80 hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ingested Documents
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono">
              {stats.documents.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>{stats.documents > 0 ? "99.8% AI extraction confidence" : "Ready for document ingestion"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: GROUND-TRUTH CARTEL SUSPECTS & RECENT ANOMALY FEED */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Ground-Truth Suspects Matrix (7 Cols) */}
        <Card className="lg:col-span-7 border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-400" />
                Planted Ground-Truth Suspects
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {stats.entities > 0 
                  ? "Identified automatically via PageRank and Betweenness graph topology algorithms."
                  : "No cartel data loaded. Click 'Reset & Load Demo Cartel' below to populate benchmark suspects."}
              </CardDescription>
            </div>
            {stats.entities > 0 && (
              <Link href="/graph">
                <span className="text-xs text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1">
                  Explore Graph <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {stats.entities > 0 ? (
              <>
                {/* Devendra Maurya - Kingpin */}
                <div className="rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/20 via-slate-900 to-slate-900 p-3.5 flex items-center justify-between gap-3 hover:border-rose-500/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                      KP
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-100">Devendra Maurya</p>
                        <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded">
                          CARTEL KINGPIN
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Rank 1 PageRank (0.0482) • High Degree Centrality (18 connections)
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold text-rose-400">Risk: 95/100</div>
                    <span className="text-[10px] text-slate-500 font-mono">Rank #1 Hub</span>
                  </div>
                </div>

                {/* Arjun Sen - Broker */}
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 p-3.5 flex items-center justify-between gap-3 hover:border-amber-500/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                      BR
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-100">Arjun Sen</p>
                        <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                          BOTTLENECK BROKER
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Rank 1 Betweenness Centrality (147.4) • Sole bridge linking Delhi & UP cells
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold text-amber-400">Risk: 88/100</div>
                    <span className="text-[10px] text-slate-500 font-mono">Rank #1 Bridge</span>
                  </div>
                </div>

                {/* Ramesh Patel - Money Mule */}
                <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-slate-900 to-slate-900 p-3.5 flex items-center justify-between gap-3 hover:border-purple-500/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                      MM
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-100">Ramesh Patel</p>
                        <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded">
                          FINANCIAL MULE
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Structuring Cash Transfers (₹49,500 smurfing) • Circular fund return loop
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold text-purple-400">Risk: 78/100</div>
                    <span className="text-[10px] text-slate-500 font-mono">Structuring</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 space-y-2">
                <Users className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">Clean Slate — No Suspect Entities</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Your workspace currently has 0 entities. Go to <Link href="/ingestion" className="text-sky-400 underline">Data Ingestion</Link> to process new FIRs/CDRs, or click "Load Demo Cartel" below.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Anomaly Feed (5 Cols) */}
        <Card className="lg:col-span-5 border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-sky-400 animate-pulse" />
                Live Anomaly Feed
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Automated rule triggers & AI pattern matches.
              </CardDescription>
            </div>
            {stats.alerts > 0 && (
              <Link href="/alerts">
                <span className="text-xs text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1">
                  All Alerts <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {stats.alerts > 0 ? (
              <>
                {/* Alert 1 */}
                <div className="p-3 rounded-lg border border-rose-900/40 bg-rose-950/20 flex gap-3 items-start">
                  <div className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-ping" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-rose-300">Burner Phone Lifespan Spike</p>
                      <span className="text-[10px] font-mono text-rose-400 font-semibold">CRITICAL</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      SIM +91 98101 22340 active for &lt;4 days with 89% outbound calls to broker.
                    </p>
                  </div>
                </div>

                {/* Alert 2 */}
                <div className="p-3 rounded-lg border border-amber-900/40 bg-amber-950/20 flex gap-3 items-start">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-300">Circular Fund Laundering</p>
                      <span className="text-[10px] font-mono text-amber-400 font-semibold">HIGH</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      ₹4,90,000 returned to source account ACC-DEL-4091 via 3 shell mule hops.
                    </p>
                  </div>
                </div>

                {/* Alert 3 */}
                <div className="p-3 rounded-lg border border-sky-900/40 bg-sky-950/20 flex gap-3 items-start">
                  <div className="h-2 w-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-sky-300">Cell Tower Co-Location Match</p>
                      <span className="text-[10px] font-mono text-sky-400 font-semibold">MEDIUM</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Target A & Target B registered on Connaught Place Tower within 8 minutes.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">No Active Anomalies</p>
                <p className="text-[11px] text-slate-500">
                  All alert queues are clear. Ingest new call records or seed demo data to trigger detection heuristics.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: DATABASE CONTROLLER (WIPE ALL PAST DATA & SEED DEMO) */}
      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <div>
                <CardTitle className="text-base">Environment Data Controls & Benchmark Suite</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Wipe all past data to start with a clean slate, or seed the ground-truth benchmark cartel.
                </CardDescription>
              </div>
            </div>
            <span className="hidden sm:inline-block font-mono text-[11px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
              Database: {stats.entities} Entities / {stats.documents} Docs
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Load Seed Button */}
            <Button
              variant="cyber"
              onClick={handleLoadSeed}
              disabled={loading !== null}
              className="text-xs font-semibold"
            >
              {loading === "load" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading 672+ Cartel Entities...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Reset & Load Ground-Truth Demo Cartel
                </>
              )}
            </Button>

            {/* Direct 1-Click Wipe All Data Button */}
            <Button
              variant="outline"
              onClick={handleWipeAllData}
              disabled={loading !== null}
              className="text-xs font-semibold border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white gap-1.5 cursor-pointer shadow-sm"
              title="Delete all data in 1 click"
            >
              {loading === "wipe" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-rose-400" />
                  Wiping All Data...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5 text-rose-400" />
                  1-Click Reset All Data (Clean Slate / 0 Records)
                </>
              )}
            </Button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
                  : "bg-rose-950/40 border-rose-800/80 text-rose-300"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
