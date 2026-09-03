"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatabaseClient, isDegradedMode, supabase } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import {
  TrendingUp,
  Users,
  Link2,
  FileText,
  ShieldAlert,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  Loader2,
  BarChart3,
  Network,
  Flame,
  Award,
  ArrowRight,
  ExternalLink,
  Search,
  Sparkles
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie
} from "recharts";

export default function AnalyticsPage() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    casesCount: 4,
    docsCount: 750,
    entsCount: 672,
    relsCount: 3560,
    alertsCount: 12
  });

  const [entityChartData, setEntityChartData] = React.useState<any[]>([]);
  const [suspectChartData, setSuspectChartData] = React.useState<any[]>([]);
  const [scatterData, setScatterData] = React.useState<any[]>([]);
  const [communityData, setCommunityData] = React.useState<any[]>([]);
  const [topPageRank, setTopPageRank] = React.useState<any[]>([]);
  const [topBetweenness, setTopBetweenness] = React.useState<any[]>([]);
  const [entities, setEntities] = React.useState<any[]>([]);
  const [metrics, setMetrics] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [docs, ents, rels, cases, alerts] = await Promise.all([
          DatabaseClient.getDocuments(),
          DatabaseClient.getEntities(),
          DatabaseClient.getRelationships(),
          DatabaseClient.getCases(),
          DatabaseClient.getAlerts()
        ]);

        let mets: any[] = [];
        if (isDegradedMode) {
          const db = MockDatabase.load();
          mets = db.entity_metrics || [];
        } else {
          const { data } = await supabase!.from("entity_metrics").select("*");
          mets = data || [];
        }

        setEntities(ents);
        setMetrics(mets);

        setStats({
          casesCount: cases.length,
          docsCount: docs.length,
          entsCount: ents.length,
          relsCount: rels.length,
          alertsCount: alerts.length
        });

        // 1. Group entities by type
        const typeCounts: Record<string, number> = {};
        ents.forEach((e: any) => {
          const type = e.entity_type || "other";
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const entityTypeLabels: Record<string, { label: string; color: string }> = {
          person: { label: "Suspects", color: "#0284c7" },
          phone: { label: "Burner Phones", color: "#059669" },
          vehicle: { label: "Vehicles", color: "#d97706" },
          bank_account: { label: "Bank Accounts", color: "#7c3aed" },
          location: { label: "Locations", color: "#e11d48" },
          organization: { label: "Front Orgs", color: "#db2777" }
        };

        const distData = Object.entries(typeCounts).map(([type, count]) => ({
          name: entityTypeLabels[type]?.label || type.toUpperCase(),
          count,
          color: entityTypeLabels[type]?.color || "#64748b"
        }));
        setEntityChartData(distData);

        // 2. Top suspects by risk score
        const sortedSuspects = [...ents]
          .filter((e: any) => e.entity_type === "person" || e.risk_score > 0)
          .sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0))
          .slice(0, 6)
          .map((e: any) => ({
            name: e.canonical_name,
            risk: e.risk_score || 0
          }));
        setSuspectChartData(sortedSuspects);

        // 3. Centrality Scatter plot (Betweenness vs PageRank)
        const scatter = mets
          .map(m => {
            const ent = ents.find(e => e.id === m.entity_id);
            if (!ent) return null;
            return {
              name: ent.canonical_name,
              type: ent.entity_type,
              pagerank: Number((m.pagerank || 0).toFixed(4)),
              betweenness: Number((m.betweenness || 0).toFixed(1)),
              risk: ent.risk_score || 10
            };
          })
          .filter(Boolean)
          .slice(0, 50);
        setScatterData(scatter);

        // 4. Louvain Community clusters
        const commCounts: Record<number, number> = {};
        mets.forEach(m => {
          if (m.community_id !== undefined) {
            commCounts[m.community_id] = (commCounts[m.community_id] || 0) + 1;
          }
        });
        const cData = [
          { name: "Delhi Core Cell (#0)", value: commCounts[0] || 18, fill: "#0284c7" },
          { name: "UP Supply Branch (#1)", value: commCounts[1] || 14, fill: "#059669" },
          { name: "Logistics / Transport (#2)", value: commCounts[2] || 8, fill: "#d97706" }
        ];
        setCommunityData(cData);

        // 5. Ranked Leaderboards
        const prList = [...mets]
          .sort((a, b) => (b.pagerank || 0) - (a.pagerank || 0))
          .slice(0, 5)
          .map(m => {
            const ent = ents.find(e => e.id === m.entity_id);
            return { ...m, name: ent?.canonical_name || "Unknown", type: ent?.entity_type || "person", risk: ent?.risk_score || 0 };
          });
        setTopPageRank(prList);

        const btList = [...mets]
          .sort((a, b) => (b.betweenness || 0) - (a.betweenness || 0))
          .slice(0, 5)
          .map(m => {
            const ent = ents.find(e => e.id === m.entity_id);
            return { ...m, name: ent?.canonical_name || "Unknown", type: ent?.entity_type || "person", risk: ent?.risk_score || 0 };
          });
        setTopBetweenness(btList);

      } catch (err) {
        console.error("Failed to load analytics data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <p className="text-xs font-mono text-slate-400">Computing Graph Centralities & Modularity Matrices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TITLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-sky-400" />
              <span>Network Analytics & Modularity Engine</span>
            </h1>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
              LOUVAIN & PAGERANK
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Algorithmic topology metrics, PageRank power iterations, Brandes betweenness, and community modularity ratios.
          </p>
        </div>

        <Link href="/graph">
          <Button variant="cyber" size="sm" className="text-xs font-semibold gap-1.5">
            <Network className="h-3.5 w-3.5" />
            View Network Topology
          </Button>
        </Link>
      </div>

      {/* 4 TELEMETRY TILES */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Entities</span>
            <Users className="h-4 w-4 text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">{stats.entsCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Resolved nodes inside graph</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Network Edges</span>
            <Link2 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">{stats.relsCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Weighted CDRs & bank transfers</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingested Dossiers</span>
            <FileText className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">{stats.docsCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">FIR reports & surveillance notes</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anomaly Detections</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400 font-mono">{stats.alertsCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated rule triggers</p>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: CHARTS (ENTITY DISTRIBUTION & SUSPECT RISK BARS) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Entity Distribution Bar Chart */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-400" />
              Entity Classification Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Categorical breakdown of extracted suspects, devices, and financial instruments.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0b1120", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {entityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Suspects Risk Scores */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-400" />
              Highest Ranked Suspect Threats (Risk Index)
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Composite additive score combining PageRank, Betweenness, and Incident Alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={suspectChartData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0b1120", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="risk" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: CENTRALITY LEADERBOARDS (PAGERANK VS BETWEENNESS) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* PageRank Leaders */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="h-4 w-4 text-sky-400" />
                PageRank Leaders (Cartel Hubs & Kingpins)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Nodes with highest recursive incoming transaction and call authority.
              </CardDescription>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
              d=0.85
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {topPageRank.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between hover:border-sky-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{item.name}</p>
                      <span className="text-[10px] font-mono text-slate-400 capitalize">{item.type}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-sky-400">
                      PR: {Number(item.pagerank || 0).toFixed(4)}
                    </div>
                    <span className="text-[10px] font-mono text-rose-400">Risk: {item.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Betweenness Centrality Leaders */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" />
                Betweenness Leaders (Network Brokers & Bridges)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Nodes positioned on the highest number of shortest paths between disparate cells.
              </CardDescription>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
              Brandes BFS
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {topBetweenness.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-200">{item.name}</p>
                        {idx === 0 && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-mono">
                            KEY BROKER
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 capitalize">{item.type}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-amber-400">
                      Score: {Number(item.betweenness || 0).toFixed(1)}
                    </div>
                    <span className="text-[10px] font-mono text-rose-400">Risk: {item.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
