"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  AlertCircle
} from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = React.useState<"load" | "reset" | null>(null);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleLoadSeed = async () => {
    setLoading("load");
    setMessage(null);
    try {
      const res = await fetch("/api/demo/load", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load seed data.");
      if (data.dbDump) {
        localStorage.setItem("kraken_mock_db", JSON.stringify(data.dbDump));
      }
      setMessage({ text: data.message, type: "success" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setMessage({ text: err.message || "Network error loading seed data.", type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const handleResetDb = async () => {
    setLoading("reset");
    setMessage(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset database.");
      localStorage.removeItem("kraken_mock_db");
      setMessage({ text: data.message, type: "success" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setMessage({ text: err.message || "Network error resetting database.", type: "error" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Intelligence Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time criminal network analysis and decision support engine.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14,284</div>
            <p className="text-xs text-muted-foreground">+182 resolved duplicates today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">3 assigned to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">18</div>
            <p className="text-xs text-muted-foreground">5 critical severity alerts pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingested Docs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,029</div>
            <p className="text-xs text-muted-foreground">99.8% extraction confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Top SUSPECTS & Recent alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Planted Ground-Truth Suspects</CardTitle>
            <CardDescription>
              Ranked automatically by Centrality indices. Target node metrics help spot network coordinators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/20 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Planted Kingpin (Ground Truth)</p>
                <p className="text-xs text-muted-foreground">High PageRank & Degree Centrality</p>
              </div>
              <span className="text-xs bg-red-500/20 text-red-400 font-mono px-2 py-0.5 rounded">Risk: 95</span>
            </div>
            <div className="rounded-lg border p-4 bg-muted/20 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Planted Broker (Ground Truth)</p>
                <p className="text-xs text-muted-foreground">Highest Betweenness (Key Linker)</p>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-400 font-mono px-2 py-0.5 rounded">Risk: 84</span>
            </div>
            <div className="rounded-lg border p-4 bg-muted/20 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Money Mule (Ground Truth)</p>
                <p className="text-xs text-muted-foreground">High PageRank, Circular transfer path node</p>
              </div>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 font-mono px-2 py-0.5 rounded">Risk: 78</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Watchlist & Recent Alerts</CardTitle>
            <CardDescription>System-wide anomalies triggered by matching pattern rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-start pb-4 border-b">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Burner Phone activity detected</p>
                <p className="text-xs text-muted-foreground">Short lifespan, mostly outgoing calls to suspected broker.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start pb-4 border-b">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Circular flow of funds anomaly</p>
                <p className="text-xs text-muted-foreground">Transfers totaling ₹4,90,000 returned to source via 3 accounts.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Geographic co-location match</p>
                <p className="text-xs text-muted-foreground">Target A & B detected on the same cell tower multiple times.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Load Demo data actions */}
      <Card>
        <CardHeader>
          <CardTitle>Demonstration Quickstart</CardTitle>
          <CardDescription>Seeding and reset controls for the mock environment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              variant="default"
              onClick={handleLoadSeed}
              disabled={loading !== null}
            >
              {loading === "load" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load Mock Database (Seed 10,000+ Records)
            </Button>
            <Button
              variant="outline"
              onClick={handleResetDb}
              disabled={loading !== null}
              className="border-destructive/30 hover:bg-destructive/10 text-destructive-foreground"
            >
              {loading === "reset" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Demo Environment
            </Button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

